import { create } from 'zustand'
import { rankConfigurations, type RankedConfiguration } from '../engine/packers/rankConfigurations'
import { CONTAINER_40HC } from '../engine/containers'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'
import { DEFAULT_TOLERANCE_MM, type PackOrder } from '../engine/packers/shelfPacker'
import type { ContainerSpec, SKU } from '../engine/types'

export const TOP_N = 3

interface ContainerStoreState {
  skus: SKU[]
  /** Which container type the packer is filling -- 20GP, 40GP, or 40HC (see engine/containers.ts). */
  container: ContainerSpec
  /** Carton bulge / loading tolerance in mm, added to each dimension for placement (CLAUDE.md §5). */
  toleranceMm: number
  /** All known sequencing strategies, packed and sorted best-utilisation-first. */
  rankedConfigs: RankedConfiguration[]
  selectedOrder: PackOrder
  setSkuQty: (skuId: string, qty: number) => void
  setSkuPriority: (skuId: string, priority: boolean) => void
  setToleranceMm: (toleranceMm: number) => void
  setContainer: (container: ContainerSpec) => void
  setSelectedOrder: (order: PackOrder) => void
}

function recompute(skus: SKU[], container: ContainerSpec, toleranceMm: number, previouslySelected: PackOrder) {
  const rankedConfigs = rankConfigurations(skus, container, toleranceMm)
  const topOrders = rankedConfigs.slice(0, TOP_N).map((c) => c.order)
  // Keep the user's selection if it's still in the top N after the change; otherwise the
  // configuration they were looking at dropped out of contention, so snap back to the best.
  const selectedOrder = topOrders.includes(previouslySelected) ? previouslySelected : rankedConfigs[0].order
  return { rankedConfigs, selectedOrder }
}

export const useContainerStore = create<ContainerStoreState>((set, get) => {
  const skus = loadInitialSkus()
  const container = CONTAINER_40HC
  const toleranceMm = DEFAULT_TOLERANCE_MM
  const initial = recompute(skus, container, toleranceMm, 'as-entered')

  return {
    skus,
    container,
    toleranceMm,
    ...initial,

    setSkuQty: (skuId, qty) => {
      const nextSkus = get().skus.map((sku) =>
        sku.id === skuId ? { ...sku, qty: Math.max(0, Math.round(qty)) } : sku,
      )
      set({ skus: nextSkus, ...recompute(nextSkus, get().container, get().toleranceMm, get().selectedOrder) })
    },

    setSkuPriority: (skuId, priority) => {
      const nextSkus = get().skus.map((sku) => (sku.id === skuId ? { ...sku, priority } : sku))
      set({ skus: nextSkus, ...recompute(nextSkus, get().container, get().toleranceMm, get().selectedOrder) })
    },

    setToleranceMm: (toleranceMm) => {
      const clamped = Math.max(0, Math.round(toleranceMm))
      set({ toleranceMm: clamped, ...recompute(get().skus, get().container, clamped, get().selectedOrder) })
    },

    setContainer: (container) => {
      set({ container, ...recompute(get().skus, container, get().toleranceMm, get().selectedOrder) })
    },

    setSelectedOrder: (order) => set({ selectedOrder: order }),
  }
})
