import { validate } from '../validate'
import { chooseFootprint } from './footprintOrientation'
import { mm, type Box, type ContainerSpec, type PackResult, type SKU, type SlabSummary } from '../types'

/**
 * Carton bulge / loading tolerance (CLAUDE.md §5, PLAN.md D7): real cartons aren't their spec
 * dimensions -- a carton packed full bulges, and no crew loads to the literal millimetre.
 * Applied additively per dimension (`effectiveDim = spec + tolerance`) for placement math only;
 * the nominal spec size is what's rendered and what counts as "loaded" cargo volume. Default is
 * PLAN.md's conservative end (5-15mm typical).
 */
export const DEFAULT_TOLERANCE_MM = 5

/**
 * Which sequence SKUs get their slabs allocated in. Each is a distinct, explainable heuristic a
 * planner might reasonably try by hand -- the point isn't that any one of them is "the" answer,
 * it's that packing and scoring several of them lets you compare outcomes instead of trusting a
 * single clever derivation. See `rankConfigurations` for running all of them and ranking by
 * outcome.
 *
 *  - 'as-entered': the order the caller's SKU list is in (e.g. CSV row order, or SKU-grid order).
 *  - 'density-desc': sorted by volume delivered per mm of container length consumed. This is the
 *    greedy fractional-knapsack solution and is optimal IF length could be allocated
 *    continuously -- but this packer rounds each SKU's last partial column of boxes up to a full
 *    column, wasting whatever length that column didn't use. With only a handful of SKUs whose
 *    box sizes are large relative to the container, that rounding waste is not negligible: it was
 *    tested against 'footprint-desc' on data.csv and lost (81.6% vs 82.6%). So this is a strong
 *    heuristic, not a provable optimum for the real (integer) packer -- which is exactly why it's
 *    ranked empirically alongside the others rather than assumed to win.
 *  - 'footprint-desc': largest floor footprint (l x w) first -- the classic "biggest boxes first"
 *    instinct.
 *  - 'volume-desc': largest per-box volume first.
 *  - 'qty-desc': the SKU with the most units to ship goes first.
 *  - 'qty-asc': the SKU with the fewest units goes first, so small orders aren't crowded out by
 *    the time their turn comes.
 */
export type PackOrder = 'as-entered' | 'density-desc' | 'footprint-desc' | 'volume-desc' | 'qty-desc' | 'qty-asc'

export const ALL_PACK_ORDERS: PackOrder[] = [
  'as-entered',
  'density-desc',
  'footprint-desc',
  'volume-desc',
  'qty-desc',
  'qty-asc',
]

export const PACK_ORDER_LABEL: Record<PackOrder, string> = {
  'as-entered': 'As entered',
  'density-desc': 'Max volume/mm first',
  'footprint-desc': 'Largest footprint first',
  'volume-desc': 'Largest volume first',
  'qty-desc': 'Highest quantity first',
  'qty-asc': 'Lowest quantity first',
}

/** Volume (mm^3) this SKU delivers per mm of container length its slab consumes, at effective (tolerance-inflated) size. */
function densityPerMm(sku: SKU, container: ContainerSpec, toleranceMm: number): number {
  const perY = Math.floor(container.w / (sku.w + toleranceMm))
  const perZ = Math.floor(container.h / (sku.h + toleranceMm))
  return perY * perZ * (sku.w + toleranceMm) * (sku.h + toleranceMm)
}

function orderSkus(skus: SKU[], container: ContainerSpec, order: PackOrder, toleranceMm: number): SKU[] {
  switch (order) {
    case 'density-desc':
      return [...skus].sort((a, b) => densityPerMm(b, container, toleranceMm) - densityPerMm(a, container, toleranceMm))
    case 'footprint-desc':
      return [...skus].sort((a, b) => b.l * b.w - a.l * a.w)
    case 'volume-desc':
      return [...skus].sort((a, b) => b.l * b.w * b.h - a.l * a.w * a.h)
    case 'qty-desc':
      return [...skus].sort((a, b) => b.qty - a.qty)
    case 'qty-asc':
      return [...skus].sort((a, b) => a.qty - b.qty)
    case 'as-entered':
    default:
      return [...skus]
  }
}

/**
 * Sequential per-SKU grid-fill slabs along the container length (X).
 *
 * Each SKU gets an exclusive slice of the container's length and grid-fills it top-to-bottom,
 * row-by-row, layer-by-layer using only its own dimensions -- PLAN.md §3 rung 1
 * ("single-SKU grid fill: floor(L/l) x floor(W/w) x floor(H/h)"), generalized to multiple SKUs
 * by giving each one its own slab instead of interleaving SKUs within a shared layer.
 *
 * This deliberately avoids ever stacking one SKU on top of a different SKU: an earlier version
 * interleaved SKUs within shared Z-layers (closer to real "wall building"), but advancing the
 * shared Z-cursor by the tallest box in a mixed-height layer left shorter boxes underneath with
 * unsupported air above them -- a genuine floating violation, caught by running the real
 * data.csv SKUs through validate(). Per-SKU slabs sidestep that: within a slab only one SKU's
 * dimensions are ever involved, so a box at z>0 always has an identical box of the same SKU
 * directly beneath it (filled in x -> y -> z order), which is support-correct by construction.
 *
 * Trade-off: SKUs never share a Z-band even when their heights would allow it, so this leaves
 * more on the table than a true layer/wall-building packer (PLAN.md §3 rung 4) -- that, and the
 * boundary/ceiling loss visible at each slab's edges, is exactly what M2's loss attribution is
 * for. This is still not Extreme Points + Best Fit Decreasing (the real Phase 1/M1 packer) --
 * it's the fastest path to a real, testable, support-correct pack using actual data.
 *
 * Footprint rotation (length/width swap, height never touched -- see `SKU.allowRotation` and
 * `footprintOrientation.ts`) is decided once per SKU, per slab, before any of the math below
 * runs: `chooseFootprint` simulates both orientations against the real remaining length and
 * hands back whichever one places more units, plus the capacity numbers this loop reuses
 * directly. That choice is a separate, self-contained module on purpose -- it doesn't touch
 * `orderSkus`/`PackOrder` (a SKU's sequence position is decided first, independently) and it
 * isn't a second thing this function has to reason about, just an input it's handed. Full
 * 6-orientation search (tipping a box onto its side) is still out of scope, per PLAN.md D2's
 * upright-only default.
 *
 * Each SKU's own `priority` flag (default true) independently decides how its slab handles a
 * trailing partial column -- the rectangular `perY x perZ` cross-section wall a slab is built
 * from. Priority SKUs round UP: the partial last column is placed anyway, reserving that
 * column's full length even though it isn't full (this is the `columnRoundingMm3` waste named in
 * lossAttribution.ts) -- because a priority SKU's whole quantity must ship. Non-priority SKUs
 * round DOWN instead: only complete columns are placed, the remainder is held back (added to
 * `unplaced`), and the length that would have been reserved for the partial column is freed for
 * whatever SKU comes next in the sequence. This is a per-SKU input the user sets deliberately, not
 * something the base ordering algorithm (`order`) decides on its own.
 */
export function pack(
  skus: SKU[],
  container: ContainerSpec,
  order: PackOrder = 'as-entered',
  toleranceMm: number = DEFAULT_TOLERANCE_MM,
): PackResult {
  const sorted = orderSkus(skus, container, order, toleranceMm)

  const boxes: Box[] = []
  const placementHistory: string[] = []
  const unplaced: { skuId: string; qty: number }[] = []
  const slabs: SlabSummary[] = []

  let cursorX = 0

  for (const sku of sorted) {
    const { h, qty } = sku
    const remainingL = container.l - cursorX

    const { l, w, rotated, capacity } = chooseFootprint(sku, container, toleranceMm, remainingL)
    const { perX, perY, perZ, columnsUsed, toPlace: actualToPlace } = capacity

    // Effective (tolerance-inflated) dims drive placement math and spacing; boxes are stored
    // and rendered at their nominal (chosen-footprint) size, so tolerance shows up as real
    // visible gaps between adjacent boxes rather than a hidden fudge factor.
    const effL = l + toleranceMm
    const effW = w + toleranceMm
    const effH = h + toleranceMm

    let placedCount = 0
    columns: for (let xi = 0; xi < perX; xi++) {
      for (let yi = 0; yi < perY; yi++) {
        for (let zi = 0; zi < perZ; zi++) {
          if (placedCount >= actualToPlace) break columns

          const box: Box = {
            id: `${sku.id}-${placedCount}`,
            skuId: sku.id,
            x: mm(cursorX + xi * effL),
            y: mm(yi * effW),
            z: mm(zi * effH),
            l,
            w,
            h,
            orientation: rotated ? 1 : 0,
          }
          boxes.push(box)
          placementHistory.push(box.id)
          placedCount++
        }
      }
    }

    if (qty > actualToPlace) {
      unplaced.push({ skuId: sku.id, qty: qty - actualToPlace })
    }

    slabs.push({
      skuId: sku.id,
      l,
      w,
      h,
      effL: mm(effL),
      effW: mm(effW),
      effH: mm(effH),
      perY,
      perZ,
      columnsUsed,
      toPlace: actualToPlace,
      rotated,
    })
    cursorX += columnsUsed * effL
  }

  const state = {
    schemaVersion: 1 as const,
    container,
    boxes,
    unplaced,
    placementHistory,
    slabs,
  }

  return { state, violations: validate(state, toleranceMm) }
}
