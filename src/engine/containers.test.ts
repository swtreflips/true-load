import { describe, expect, it } from 'vitest'
import { ALL_CONTAINERS, theoreticalCapacityMm3 } from './containers'
import { pack } from './packers/shelfPacker'
import { attributeLoss } from './metrics/lossAttribution'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'

describe('container library', () => {
  it('has three distinct containers with positive usable dimensions', () => {
    expect(ALL_CONTAINERS).toHaveLength(3)
    expect(new Set(ALL_CONTAINERS.map((c) => c.id)).size).toBe(3)
    for (const container of ALL_CONTAINERS) {
      expect(container.l).toBeGreaterThan(0)
      expect(container.w).toBeGreaterThan(0)
      expect(container.h).toBeGreaterThan(0)
      expect(container.source.length).toBeGreaterThan(0)
    }
  })

  it('40GP and 40HC share the same footprint (length x width); 40HC is only taller', () => {
    const gp40 = ALL_CONTAINERS.find((c) => c.id === '40GP')!
    const hc40 = ALL_CONTAINERS.find((c) => c.id === '40HC')!
    expect(gp40.l).toBe(hc40.l)
    expect(gp40.w).toBe(hc40.w)
    expect(gp40.h).toBeLessThan(hc40.h)
  })

  it('20GP has roughly half the length of the 40ft containers', () => {
    const gp20 = ALL_CONTAINERS.find((c) => c.id === '20GP')!
    const gp40 = ALL_CONTAINERS.find((c) => c.id === '40GP')!
    expect(gp20.l).toBeLessThan(gp40.l / 1.5)
  })

  it.each(ALL_CONTAINERS.map((c) => c.id))(
    'packs the real data.csv SKUs into %s without violations, partitioning volume exactly',
    (containerId) => {
      const container = ALL_CONTAINERS.find((c) => c.id === containerId)!
      const skus = loadInitialSkus()
      const { state, violations } = pack(skus, container)

      expect(violations).toHaveLength(0)

      const breakdown = attributeLoss(state, container)
      const sum =
        breakdown.loadedMm3 +
        breakdown.packingGapsMm3 +
        breakdown.columnRoundingMm3 +
        breakdown.boundaryLossMm3 +
        breakdown.ceilingLossMm3 +
        breakdown.trailingLengthMm3
      expect(sum).toBe(theoreticalCapacityMm3(container))
    },
  )
})
