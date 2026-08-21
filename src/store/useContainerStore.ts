import { create } from 'zustand'
import { rankConfigurations, type RankedConfiguration } from '../engine/packers/rankConfigurations'
import { CONTAINER_40HC } from '../engine/containers'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'
import { DEFAULT_TOLERANCE_MM, type PackOrder } from '../engine/packers/shelfPacker'
import type { ContainerSpec, SKU } from '../engine/types'

export const TOP_N = 3

/** Combines the pool catalog with per-SKU allocated quantities into the list that actually gets packed. */
export function toAllocatedSkus(poolSkus: SKU[], allocatedQty: Record<string, number>): SKU[] {
  return poolSkus.map((sku) => ({ ...sku, qty: allocatedQty[sku.id] ?? 0 }))
}

interface ContainerStoreState {
  /** The full data.csv catalog. `qty` here is TOTAL available, not what's loaded -- see allocatedQty. */
  poolSkus: SKU[]
  /**
   * skuId -> quantity allocated into the container. Starts empty (every SKU at 0), so the
   * container starts empty too -- the packer only ever sees what's been explicitly allocated,
   * not the raw pool.
   */
  allocatedQty: Record<string, number>
  /** Which container type the packer is filling -- 20GP, 40GP, or 40HC (see engine/containers.ts). */
  container: ContainerSpec
  /** Carton bulge / loading tolerance in mm, added to each dimension for placement (CLAUDE.md §5). */
  toleranceMm: number
  /** All known sequencing strategies, packed and sorted best-utilisation-first. */
  rankedConfigs: RankedConfiguration[]
  selectedOrder: PackOrder
  /** Edits a SKU's total pool quantity; clamps its allocation down if it now exceeds the new total. */
  setPoolQty: (skuId: string, qty: number) => void
  /** Edits how much of a SKU is allocated into the container, clamped to [0, pool total]. */
  setAllocatedQty: (skuId: string, qty: number) => void
  /** Convenience: allocates every remaining available unit of a SKU. */
  allocateAll: (skuId: string) => void
  setSkuPriority: (skuId: string, priority: boolean) => void
  setToleranceMm: (toleranceMm: number) => void
  setContainer: (container: ContainerSpec) => void
  setSelectedOrder: (order: PackOrder) => void
}

function recompute(
  poolSkus: SKU[],
  allocatedQty: Record<string, number>,
  container: ContainerSpec,
  toleranceMm: number,
  previouslySelected: PackOrder,
) {
  const rankedConfigs = rankConfigurations(toAllocatedSkus(poolSkus, allocatedQty), container, toleranceMm)
  const topOrders = rankedConfigs.slice(0, TOP_N).map((c) => c.order)
  // Keep the user's selection if it's still in the top N after the change; otherwise the
  // configuration they were looking at dropped out of contention, so snap back to the best.
  const selectedOrder = topOrders.includes(previouslySelected) ? previouslySelected : rankedConfigs[0].order
  return { rankedConfigs, selectedOrder }
}

export const useContainerStore = create<ContainerStoreState>((set, get) => {
  const poolSkus = loadInitialSkus()
  const allocatedQty: Record<string, number> = {}
  const container = CONTAINER_40HC
  const toleranceMm = DEFAULT_TOLERANCE_MM
  const initial = recompute(poolSkus, allocatedQty, container, toleranceMm, 'as-entered')

  return {
    poolSkus,
    allocatedQty,
    container,
    toleranceMm,
    ...initial,

    setPoolQty: (skuId, qty) => {
      const total = Math.max(0, Math.round(qty))
      const nextPool = get().poolSkus.map((sku) => (sku.id === skuId ? { ...sku, qty: total } : sku))
      const nextAllocated = { ...get().allocatedQty }
      if ((nextAllocated[skuId] ?? 0) > total) {
        nextAllocated[skuId] = total
      }
      set({
        poolSkus: nextPool,
        allocatedQty: nextAllocated,
        ...recompute(nextPool, nextAllocated, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setAllocatedQty: (skuId, qty) => {
      const total = get().poolSkus.find((s) => s.id === skuId)?.qty ?? 0
      const nextAllocated = { ...get().allocatedQty, [skuId]: Math.min(Math.max(0, Math.round(qty)), total) }
      set({
        allocatedQty: nextAllocated,
        ...recompute(get().poolSkus, nextAllocated, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    allocateAll: (skuId) => {
      const total = get().poolSkus.find((s) => s.id === skuId)?.qty ?? 0
      get().setAllocatedQty(skuId, total)
    },

    setSkuPriority: (skuId, priority) => {
      const nextPool = get().poolSkus.map((sku) => (sku.id === skuId ? { ...sku, priority } : sku))
      set({
        poolSkus: nextPool,
        ...recompute(nextPool, get().allocatedQty, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setToleranceMm: (toleranceMm) => {
      const clamped = Math.max(0, Math.round(toleranceMm))
      set({
        toleranceMm: clamped,
        ...recompute(get().poolSkus, get().allocatedQty, get().container, clamped, get().selectedOrder),
      })
    },

    setContainer: (container) => {
      set({
        container,
        ...recompute(get().poolSkus, get().allocatedQty, container, get().toleranceMm, get().selectedOrder),
      })
    },

    setSelectedOrder: (order) => set({ selectedOrder: order }),
  }
})
