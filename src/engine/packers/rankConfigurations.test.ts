import { describe, expect, it } from 'vitest'
import { rankConfigurations } from './rankConfigurations'
import { ALL_PACK_ORDERS } from './shelfPacker'
import { CONTAINER_40HC } from '../containers'
import { loadInitialSkus } from '../../fixtures/loadInitialSkus'

describe('rankConfigurations', () => {
  it('ranks all known strategies, best utilisation first', () => {
    const skus = loadInitialSkus()
    const ranked = rankConfigurations(skus, CONTAINER_40HC)

    expect(ranked).toHaveLength(ALL_PACK_ORDERS.length)
    expect(new Set(ranked.map((r) => r.order))).toEqual(new Set(ALL_PACK_ORDERS))

    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].utilisation.utilisationRatio).toBeGreaterThanOrEqual(ranked[i].utilisation.utilisationRatio)
    }

    // Deliberately not asserting which strategy wins: 'density-desc' is a strong heuristic
    // (optimal for a continuous relaxation of this problem) but not a provable optimum for the
    // real integer packer -- on data.csv, 'footprint-desc' actually wins by beating it 82.6% to
    // 81.6%, because 'density-desc' ignores the per-SKU column-rounding waste. Ranking
    // empirically instead of trusting one derivation is the whole point of this function.
    expect(ranked[0].utilisation.utilisationRatio).toBeGreaterThan(0.5)
  })

  it('produces zero violations under every strategy', () => {
    const skus = loadInitialSkus()
    const ranked = rankConfigurations(skus, CONTAINER_40HC)

    for (const config of ranked) {
      expect(config.violations).toHaveLength(0)
    }
  })
})
