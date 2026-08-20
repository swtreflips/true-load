import type { ContainerSpec, ContainerState } from '../types'

/**
 * Named categories of unused container volume (CLAUDE.md "name the losses separately"), computed
 * exactly from this packer's known slab geometry -- not estimated, not approximated. Each mm^3
 * of the container is assigned to exactly one bucket (PLAN.md D10: a fixed priority order, so
 * the categories partition the volume exactly rather than double-counting or leaving a gap).
 *
 *  - loaded: real cargo volume (nominal box dims) -- not a loss, included so the buckets sum to
 *    the full container.
 *  - packingGaps: the tolerance buffer reserved around every PLACED box (effective size minus
 *    nominal size). This is what "space between boxes" looks like numerically.
 *  - columnRounding: cells reserved within a slab's used columns but left empty because that
 *    SKU's own quantity ran out before filling the last column. Distinct from packingGaps: this
 *    is a supply shortfall, not a per-box tolerance buffer -- and it's exactly the effect that
 *    made the 'density-desc' order lose to 'footprint-desc' on data.csv (see shelfPacker.ts).
 *  - boundaryLoss: the strip along the container width no row reaches, per slab.
 *  - ceilingLoss: the strip along the container height no layer reaches, per slab.
 *  - trailingLength: container length never allocated to any slab -- either demand ran out, or
 *    the next SKU didn't fit in what was left.
 */
export interface LossBreakdown {
  loadedMm3: number
  packingGapsMm3: number
  columnRoundingMm3: number
  boundaryLossMm3: number
  ceilingLossMm3: number
  trailingLengthMm3: number
}

export function attributeLoss(state: ContainerState, container: ContainerSpec): LossBreakdown {
  let loadedMm3 = 0
  let packingGapsMm3 = 0
  let columnRoundingMm3 = 0
  let boundaryLossMm3 = 0
  let ceilingLossMm3 = 0
  let cursorX = 0

  for (const slab of state.slabs) {
    const { l, w, h, effL, effW, effH, perY, perZ, columnsUsed, toPlace } = slab

    loadedMm3 += toPlace * l * w * h
    packingGapsMm3 += toPlace * (effL * effW * effH - l * w * h)

    // For a non-priority SKU (sku.priority === false, see types.ts), columnsUsed*perY*perZ ===
    // toPlace always (only whole columns are ever placed), so this term is provably 0 for that
    // slab -- the whole point of deprioritizing a SKU is trading placed units of it for driving
    // this category to zero.
    const reservedCells = columnsUsed * perY * perZ
    columnRoundingMm3 += (reservedCells - toPlace) * effL * effW * effH

    const slabLength = columnsUsed * effL
    boundaryLossMm3 += slabLength * (container.w - perY * effW) * container.h
    ceilingLossMm3 += slabLength * perY * effW * (container.h - perZ * effH)

    cursorX += slabLength
  }

  const trailingLengthMm3 = (container.l - cursorX) * container.w * container.h

  return { loadedMm3, packingGapsMm3, columnRoundingMm3, boundaryLossMm3, ceilingLossMm3, trailingLengthMm3 }
}
