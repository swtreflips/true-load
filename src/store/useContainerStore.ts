import { create } from 'zustand'
import { pack, type PackOrder } from '../engine/packers/shelfPacker'
import { CONTAINER_40HC } from '../engine/containers'
import { computeUtilisation, type Utilisation } from '../engine/metrics/utilisation'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'
import type { ContainerState, SKU, UnplacedEntry, Violation } from '../engine/types'

export interface OrderResult {
  containerState: ContainerState
  violations: Violation[]
  utilisation: Utilisation
  unplaced: UnplacedEntry[]
}

interface ContainerStoreState {
  skus: SKU[]
  activeOrder: PackOrder
  active: OrderResult
  /** The other order's result, computed alongside the active one so the trade-off is always visible. */
  comparisonOrder: PackOrder
  comparison: OrderResult
  setSkuQty: (skuId: string, qty: number) => void
  setActiveOrder: (order: PackOrder) => void
}

function otherOrder(order: PackOrder): PackOrder {
  return order === 'as-entered' ? 'optimal-density' : 'as-entered'
}

function packOrder(skus: SKU[], order: PackOrder): OrderResult {
  const { state, violations } = pack(skus, CONTAINER_40HC, order)
  return {
    containerState: state,
    violations,
    utilisation: computeUtilisation(state),
    unplaced: state.unplaced,
  }
}

function computeBoth(skus: SKU[], activeOrder: PackOrder) {
  const comparisonOrder = otherOrder(activeOrder)
  return {
    active: packOrder(skus, activeOrder),
    comparisonOrder,
    comparison: packOrder(skus, comparisonOrder),
  }
}

export const useContainerStore = create<ContainerStoreState>((set, get) => {
  const skus = loadInitialSkus()
  const activeOrder: PackOrder = 'as-entered'

  return {
    skus,
    activeOrder,
    ...computeBoth(skus, activeOrder),

    setSkuQty: (skuId, qty) => {
      const nextSkus = get().skus.map((sku) =>
        sku.id === skuId ? { ...sku, qty: Math.max(0, Math.round(qty)) } : sku,
      )
      set({ skus: nextSkus, ...computeBoth(nextSkus, get().activeOrder) })
    },

    setActiveOrder: (order) => {
      set({ activeOrder: order, ...computeBoth(get().skus, order) })
    },
  }
})
