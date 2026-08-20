import { describe, expect, it } from 'vitest'
import { loadInitialSkus } from './loadInitialSkus'
import { pack } from '../engine/packers/shelfPacker'
import { CONTAINER_40HC } from '../engine/containers'
import { computeUtilisation } from '../engine/metrics/utilisation'

describe('data.csv against a 40HC', () => {
  it('parses the 5 SKUs with the expected quantities', () => {
    const skus = loadInitialSkus()
    expect(skus).toHaveLength(5)
    expect(skus.reduce((sum, s) => sum + s.qty, 0)).toBe(1550)
  })

  it.each(['as-entered', 'density-desc'] as const)(
    'packs without violations under %s order, and honestly reports what does not fit',
    (order) => {
      // Combined SKU volume is ~93.2 m3 (275x0.058194 + 400x0.058194 + 300x0.09177 +
      // 200x0.068172 + 375x0.03404, hand-computed from data.csv), which exceeds a 40HC's
      // ~76.2-76.35 m3 usable capacity even before packing losses. So this order does NOT
      // fully fit -- the point of the whole project (PLAN.md D4: load what fits, report the
      // remainder) -- and this test asserts that honestly rather than assuming a full load.
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
