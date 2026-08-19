import { validate } from '../validate'
import { mm, type Box, type ContainerSpec, type PackResult, type SKU } from '../types'

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
 * Not this pass: rotation search (upright-only, orientation index 0, per PLAN.md D2 default).
 */
export function pack(skus: SKU[], container: ContainerSpec): PackResult {
  const sorted = [...skus].sort((a, b) => b.l * b.w - a.l * a.w)

  const boxes: Box[] = []
  const placementHistory: string[] = []
  const unplaced: { skuId: string; qty: number }[] = []

  let cursorX = 0

  for (const sku of sorted) {
    const { l, w, h, qty } = sku
    const remainingL = container.l - cursorX

    const perX = Math.floor(remainingL / l)
    const perY = Math.floor(container.w / w)
    const perZ = Math.floor(container.h / h)
    const capacity = perX * perY * perZ
    const toPlace = Math.min(qty, capacity)

    let placedCount = 0
    columns: for (let xi = 0; xi < perX; xi++) {
      for (let yi = 0; yi < perY; yi++) {
        for (let zi = 0; zi < perZ; zi++) {
          if (placedCount >= toPlace) break columns

          const box: Box = {
            id: `${sku.id}-${placedCount}`,
            skuId: sku.id,
            x: mm(cursorX + xi * l),
            y: mm(yi * w),
            z: mm(zi * h),
            l,
            w,
            h,
            orientation: 0,
          }
          boxes.push(box)
          placementHistory.push(box.id)
          placedCount++
        }
      }
    }

    if (qty > toPlace) {
      unplaced.push({ skuId: sku.id, qty: qty - toPlace })
    }

    const columnsUsed = perY * perZ > 0 ? Math.ceil(toPlace / (perY * perZ)) : 0
    cursorX += columnsUsed * l
  }

  const state = {
    schemaVersion: 1 as const,
    container,
    boxes,
    unplaced,
    placementHistory,
  }

  return { state, violations: validate(state) }
}
