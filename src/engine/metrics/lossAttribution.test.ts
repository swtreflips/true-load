import { describe, expect, it } from 'vitest'
import { attributeLoss } from './lossAttribution'
import { pack, ALL_PACK_ORDERS } from '../packers/shelfPacker'
import { CONTAINER_40HC, theoreticalCapacityMm3 } from '../containers'
import { GRID_CONTAINER, GRID_SKU, PARTIAL_COLUMN_CONTAINER, PARTIAL_COLUMN_SKU } from '../../fixtures/knownAnswers'
import { loadInitialSkus } from '../../fixtures/loadInitialSkus'

function sumBreakdown(b: ReturnType<typeof attributeLoss>): number {
  return b.loadedMm3 + b.packingGapsMm3 + b.columnRoundingMm3 + b.boundaryLossMm3 + b.ceilingLossMm3 + b.trailingLengthMm3
}

describe('attributeLoss', () => {
  it('partitions the container volume exactly, on the grid fixture', () => {
    const { state } = pack([GRID_SKU], GRID_CONTAINER, 'as-entered', 0)
    const breakdown = attributeLoss(state, GRID_CONTAINER)

    expect(sumBreakdown(breakdown)).toBe(theoreticalCapacityMm3(GRID_CONTAINER))
    // Exact 2x2x2 fit, zero tolerance: nothing should be lost to anything but loaded volume.
    expect(breakdown.packingGapsMm3).toBe(0)
    expect(breakdown.columnRoundingMm3).toBe(0)
    expect(breakdown.boundaryLossMm3).toBe(0)
    expect(breakdown.ceilingLossMm3).toBe(0)
    expect(breakdown.trailingLengthMm3).toBe(0)
  })

  it('partitions the container volume exactly for every strategy and a real tolerance, on data.csv', () => {
    const skus = loadInitialSkus()
    for (const order of ALL_PACK_ORDERS) {
      const { state } = pack(skus, CONTAINER_40HC, order, 5)
      const breakdown = attributeLoss(state, CONTAINER_40HC)
      expect(sumBreakdown(breakdown)).toBe(theoreticalCapacityMm3(CONTAINER_40HC))
    }
  })

  it('packing gaps grow with tolerance and disappear at zero tolerance', () => {
    const skus = loadInitialSkus()
    const zero = attributeLoss(pack(skus, CONTAINER_40HC, 'as-entered', 0).state, CONTAINER_40HC)
    const withTolerance = attributeLoss(pack(skus, CONTAINER_40HC, 'as-entered', 10).state, CONTAINER_40HC)

    expect(zero.packingGapsMm3).toBe(0)
    expect(withTolerance.packingGapsMm3).toBeGreaterThan(0)
  })

  it('marking a SKU non-priority drives column rounding to exactly zero, still partitioning exactly', () => {
    // PARTIAL_COLUMN_SKU: qty 10, 4 boxes/column -- 2 complete columns + a 2-box remainder that
    // doesn't complete a third. This is the concrete proof the priority flag does what it claims.
    const priority = attributeLoss(
      pack([PARTIAL_COLUMN_SKU], PARTIAL_COLUMN_CONTAINER, 'as-entered', 0).state,
      PARTIAL_COLUMN_CONTAINER,
    )
    const nonPriority = attributeLoss(
      pack([{ ...PARTIAL_COLUMN_SKU, priority: false }], PARTIAL_COLUMN_CONTAINER, 'as-entered', 0).state,
      PARTIAL_COLUMN_CONTAINER,
    )

    expect(priority.columnRoundingMm3).toBeGreaterThan(0)
    expect(nonPriority.columnRoundingMm3).toBe(0)
    expect(sumBreakdown(priority)).toBe(theoreticalCapacityMm3(PARTIAL_COLUMN_CONTAINER))
    expect(sumBreakdown(nonPriority)).toBe(theoreticalCapacityMm3(PARTIAL_COLUMN_CONTAINER))
  })
})
