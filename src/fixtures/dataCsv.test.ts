import { describe, expect, it } from 'vitest'
import { loadInitialSkus } from './loadInitialSkus'
import { pack } from '../engine/packers/shelfPacker'
import { CONTAINER_40HC } from '../engine/containers'
import { computeUtilisation } from '../engine/metrics/utilisation'

describe('data.csv against a 40HC', () => {
  it('parses the 7 SKUs with the expected quantities', () => {
    // 5 real SKUs (1550 units) + MOCK01/MOCK02 (390 each, 780 units) -- the mocks are a
    // deliberately-designed pair demonstrating footprint rotation (see footprintOrientation.ts):
    // MOCK01's as-entered footprint fits 360/column, but rotated fits 408 -- enough to place all
    // 390 instead of leaving 30 unplaced. MOCK02 is the same box pre-rotated (Width/Depth
    // swapped), so the packer correctly leaves it alone; both end up in the same orientation.
    const skus = loadInitialSkus()
    expect(skus).toHaveLength(7)
    expect(skus.reduce((sum, s) => sum + s.qty, 0)).toBe(2330)
  })

  it.each(['as-entered', 'density-desc'] as const)(
    'packs without violations under %s order, and honestly reports what does not fit',
    (order) => {
      // Combined SKU volume comfortably exceeds a 40HC's ~76.2-76.35 m3 usable capacity even
      // before packing losses, so this order does NOT fully fit -- the point of the whole
      // project (PLAN.md D4: load what fits, report the remainder) -- and this test asserts
      // that honestly rather than assuming a full load.
      const skus = loadInitialSkus()
      const totalQty = skus.reduce((sum, s) => sum + s.qty, 0)

      const { state, violations } = pack(skus, CONTAINER_40HC, order)

      expect(violations).toHaveLength(0)

      const unplacedQty = state.unplaced.reduce((sum, u) => sum + u.qty, 0)
      expect(state.boxes.length + unplacedQty).toBe(totalQty)
      expect(unplacedQty).toBeGreaterThan(0) // order volume exceeds capacity; some units don't fit

      const utilisation = computeUtilisation(state)
      expect(utilisation.loadedCbm).toBeLessThanOrEqual(utilisation.theoreticalCbm)
      expect(utilisation.utilisationRatio).toBeGreaterThan(0.5) // sane lower bound, not a tuned number
      expect(utilisation.utilisationRatio).toBeLessThanOrEqual(1)
    },
  )
})
