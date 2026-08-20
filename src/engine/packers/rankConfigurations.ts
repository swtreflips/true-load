import { ALL_PACK_ORDERS, DEFAULT_TOLERANCE_MM, pack, type PackOrder } from './shelfPacker'
import { computeUtilisation, type Utilisation } from '../metrics/utilisation'
import { attributeLoss, type LossBreakdown } from '../metrics/lossAttribution'
import type { ContainerSpec, ContainerState, SKU, Violation } from '../types'

export interface RankedConfiguration {
  order: PackOrder
  containerState: ContainerState
  violations: Violation[]
  utilisation: Utilisation
  loss: LossBreakdown
}

/**
 * Packs the given SKUs under every known sequencing strategy (PLAN.md §2's "itemOrder" policy,
 * the one lever this packer exposes) and ranks the results by utilisation, best first. This is
 * the honest way to answer "what's optimal": pack and score every candidate instead of asserting
 * one clever derivation is best. That distinction is not academic here -- 'density-desc' looked
 * provably optimal on paper (a greedy fractional-knapsack solution) but actually loses to
 * 'footprint-desc' on the real data.csv SKUs, because the derivation ignored per-SKU column-
 * rounding waste that only shows up once you actually pack and measure.
 *
 * Per-SKU `priority` (see types.ts) is an input carried on the SKUs themselves, not a strategy
 * dimension ranked here -- it's a deliberate user choice ("this SKU must ship in full" vs. "this
 * one can have its trailing partial column held back"), so every ranked config here respects
 * whatever priority flags the caller's SKUs already have.
 */
export function rankConfigurations(
  skus: SKU[],
  container: ContainerSpec,
  toleranceMm: number = DEFAULT_TOLERANCE_MM,
): RankedConfiguration[] {
  return ALL_PACK_ORDERS.map((order) => {
    const { state, violations } = pack(skus, container, order, toleranceMm)
    return {
      order,
      containerState: state,
      violations,
      utilisation: computeUtilisation(state),
      loss: attributeLoss(state, container),
    }
  }).sort((a, b) => {
    const byUtilisation = b.utilisation.utilisationRatio - a.utilisation.utilisationRatio
    if (byUtilisation !== 0) return byUtilisation
    return b.utilisation.boxesPlaced - a.utilisation.boxesPlaced
  })
}
