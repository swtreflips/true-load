import type { ContainerSpec, Mm, SKU } from '../types'

/**
 * How many of a slab's boxes actually fit, for one specific footprint. This is the exact same
 * math `pack()`'s per-SKU loop needs to run the real placement -- pulled out here so `pack()`
 * can call it once, on whichever footprint `chooseFootprint` already decided on, instead of
 * duplicating the formula.
 */
export interface SlabCapacity {
  perX: number
  perY: number
  perZ: number
  columnsUsed: number
  toPlace: number
}

export function computeSlabCapacity(
  effL: number,
  effW: number,
  effH: number,
  remainingLength: number,
  container: ContainerSpec,
  qty: number,
  roundDown: boolean,
): SlabCapacity {
  const perX = Math.floor(remainingLength / effL)
  const perY = Math.floor(container.w / effW)
  const perZ = Math.floor(container.h / effH)
  const columnCapacity = perY * perZ
  const capacity = perX * columnCapacity
  const toPlaceUncapped = Math.min(qty, capacity)

  // Same rule as pack()'s priority handling: round on `qty` (not the length-capped value),
  // capped by `perX` -- when length is the binding constraint this is a no-op, since
  // toPlaceUncapped is already an exact multiple of columnCapacity there.
  const columnsForQty = columnCapacity > 0 ? Math.floor(qty / columnCapacity) : 0
  const columnsUsed = roundDown
    ? Math.min(columnsForQty, perX)
    : columnCapacity > 0
      ? Math.ceil(toPlaceUncapped / columnCapacity)
      : 0
  const toPlace = roundDown ? columnsUsed * columnCapacity : toPlaceUncapped

  return { perX, perY, perZ, columnsUsed, toPlace }
}

/** Volume (mm^3) a footprint delivers per mm of container length one of its columns consumes. */
function densityPerMm(effW: number, effH: number, container: ContainerSpec): number {
  const perY = Math.floor(container.w / effW)
  const perZ = Math.floor(container.h / effH)
  return perY * perZ * effW * effH
}

export interface FootprintChoice {
  l: Mm
  w: Mm
  rotated: boolean
  capacity: SlabCapacity
}

/**
 * Picks between a SKU's as-entered footprint and its 90°-rotated one (l/w swapped, height
 * untouched -- never the risky kind of rotation that tips a box onto its side).
 *
 * Decided by volume-per-mm-of-length density, the SAME metric already used for the
 * 'density-desc' sequencing order -- not by simulating which orientation places more raw units.
 * That was the first thing tried, and it was wrong: maximizing one SKU's own placed count is
 * sensitive to exactly how much length happens to be left at that point in the sequence, so a
 * "locally better" rotation can consume a worse amount of length for whatever comes next and
 * make the OVERALL pack worse -- confirmed on data.csv, where it dropped the best achievable
 * result from 82.1% to 81.6%. Density is a property of the shape and the container alone,
 * independent of sequence position, which is what a per-SKU decision embedded in a larger
 * sequential pack needs to compose safely with the rest of it. Ties keep the as-entered
 * orientation.
 */
export function chooseFootprint(
  sku: SKU,
  container: ContainerSpec,
  toleranceMm: number,
  remainingLength: number,
): FootprintChoice {
  const roundDown = !sku.priority
  const effH = sku.h + toleranceMm

  let l: Mm = sku.l
  let w: Mm = sku.w
  let rotated = false

  if (sku.allowRotation && sku.l !== sku.w) {
    const asEnteredDensity = densityPerMm(sku.w + toleranceMm, effH, container)
    const rotatedDensity = densityPerMm(sku.l + toleranceMm, effH, container)
    if (rotatedDensity > asEnteredDensity) {
      l = sku.w
      w = sku.l
      rotated = true
    }
  }

  const capacity = computeSlabCapacity(l + toleranceMm, w + toleranceMm, effH, remainingLength, container, sku.qty, roundDown)
  return { l, w, rotated, capacity }
}
