import { create } from 'zustand'
import { rankConfigurations, type RankedConfiguration } from '../engine/packers/rankConfigurations'
import { CONTAINER_40HC } from '../engine/containers'
import { loadInitialSkus } from '../fixtures/loadInitialSkus'
import { DEFAULT_TOLERANCE_MM, type PackOrder } from '../engine/packers/shelfPacker'
import type { ContainerSpec, SKU } from '../engine/types'

export const TOP_N = 3

/**
 * Combines the pool catalog with per-SKU allocated quantities into the list that actually gets
 * packed, **in the user's plan order** -- `planOrder` is the sequence, not the catalog.
 *
 * That ordering is load-bearing, not cosmetic: `pack()` walks its input list front-to-back with a
 * single length cursor, so position 1 gets first claim on the container's length and everything
 * after it only sees what's left. The 'as-entered' PackOrder is the one strategy that applies no
 * sort of its own, which makes it exactly "whatever order this function returns" -- i.e. the plan
 * the user built by hand, competing on equal footing against the five computed heuristics.
 */
export function toAllocatedSkus(
  poolSkus: SKU[],
  allocatedQty: Record<string, number>,
  planOrder: string[],
): SKU[] {
  const byId = new Map(poolSkus.map((sku) => [sku.id, sku]))
  return planOrder.flatMap((skuId) => {
    const sku = byId.get(skuId)
    return sku ? [{ ...sku, qty: allocatedQty[skuId] ?? 0 }] : []
  })
}

interface ContainerStoreState {
  /**
   * The master list: every SKU from data.csv, whether or not it's ready to ship. Browsing catalog
   * only -- nothing here is packed, and `qty` is TOTAL available rather than what's loaded. A SKU
   * that isn't production-ready yet still belongs here so it can be planned hypothetically.
   */
  poolSkus: SKU[]
  /**
   * Which SKUs the user has pulled into the planning tray, in the order they added them. This is
   * the sequence 'as-entered' packs in, and the user can reorder it directly (see movePlanItem),
   * so "put this SKU in the container first" is a lever they hold rather than an accident of CSV
   * row order. Starts empty -- the container starts empty until something is deliberately added.
   */
  planOrder: string[]
  /** skuId -> quantity allocated into the container, for SKUs in `planOrder`. */
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
  /** Appends a SKU to the end of the plan with its full pool quantity allocated. No-op if already planned. */
  addToPlan: (skuId: string) => void
  /** Drops a SKU out of the plan entirely, returning its units to the pool as available. */
  removeFromPlan: (skuId: string) => void
  /** Moves a planned SKU earlier (-1) or later (+1) in the packing sequence. Clamped at the ends. */
  movePlanItem: (skuId: string, delta: -1 | 1) => void
  setSkuPriority: (skuId: string, priority: boolean) => void
  setSkuAllowRotation: (skuId: string, allowRotation: boolean) => void
  setToleranceMm: (toleranceMm: number) => void
  setContainer: (container: ContainerSpec) => void
  setSelectedOrder: (order: PackOrder) => void
}

function recompute(
  poolSkus: SKU[],
  allocatedQty: Record<string, number>,
  planOrder: string[],
  container: ContainerSpec,
  toleranceMm: number,
  previouslySelected: PackOrder,
) {
  const rankedConfigs = rankConfigurations(toAllocatedSkus(poolSkus, allocatedQty, planOrder), container, toleranceMm)
  const topOrders = rankedConfigs.slice(0, TOP_N).map((c) => c.order)
  // Keep the user's selection if it's still in the top N after the change; otherwise the
  // configuration they were looking at dropped out of contention, so snap back to the best.
  const selectedOrder = topOrders.includes(previouslySelected) ? previouslySelected : rankedConfigs[0].order
  return { rankedConfigs, selectedOrder }
}

export const useContainerStore = create<ContainerStoreState>((set, get) => {
  const poolSkus = loadInitialSkus()
  const allocatedQty: Record<string, number> = {}
  const planOrder: string[] = []
  const container = CONTAINER_40HC
  const toleranceMm = DEFAULT_TOLERANCE_MM
  const initial = recompute(poolSkus, allocatedQty, planOrder, container, toleranceMm, 'as-entered')

  return {
    poolSkus,
    planOrder,
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
        ...recompute(nextPool, nextAllocated, get().planOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setAllocatedQty: (skuId, qty) => {
      const total = get().poolSkus.find((s) => s.id === skuId)?.qty ?? 0
      const nextAllocated = { ...get().allocatedQty, [skuId]: Math.min(Math.max(0, Math.round(qty)), total) }
      set({
        allocatedQty: nextAllocated,
        ...recompute(get().poolSkus, nextAllocated, get().planOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    addToPlan: (skuId) => {
      const { planOrder: current, poolSkus: pool, allocatedQty: allocated } = get()
      if (current.includes(skuId)) return
      const total = pool.find((s) => s.id === skuId)?.qty ?? 0
      // Appended, never inserted: the plan is a running sequence the user builds, so a newly added
      // SKU queues up behind everything already committed ahead of it.
      const nextOrder = [...current, skuId]
      const nextAllocated = { ...allocated, [skuId]: total }
      set({
        planOrder: nextOrder,
        allocatedQty: nextAllocated,
        ...recompute(pool, nextAllocated, nextOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    removeFromPlan: (skuId) => {
      const nextOrder = get().planOrder.filter((id) => id !== skuId)
      const nextAllocated = { ...get().allocatedQty }
      delete nextAllocated[skuId]
      set({
        planOrder: nextOrder,
        allocatedQty: nextAllocated,
        ...recompute(get().poolSkus, nextAllocated, nextOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    movePlanItem: (skuId, delta) => {
      const current = get().planOrder
      const from = current.indexOf(skuId)
      const to = from + delta
      if (from === -1 || to < 0 || to >= current.length) return
      const nextOrder = [...current]
      ;[nextOrder[from], nextOrder[to]] = [nextOrder[to], nextOrder[from]]
      set({
        planOrder: nextOrder,
        ...recompute(get().poolSkus, get().allocatedQty, nextOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setSkuPriority: (skuId, priority) => {
      const nextPool = get().poolSkus.map((sku) => (sku.id === skuId ? { ...sku, priority } : sku))
      set({
        poolSkus: nextPool,
        ...recompute(nextPool, get().allocatedQty, get().planOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setSkuAllowRotation: (skuId, allowRotation) => {
      const nextPool = get().poolSkus.map((sku) => (sku.id === skuId ? { ...sku, allowRotation } : sku))
      set({
        poolSkus: nextPool,
        ...recompute(nextPool, get().allocatedQty, get().planOrder, get().container, get().toleranceMm, get().selectedOrder),
      })
    },

    setToleranceMm: (toleranceMm) => {
      const clamped = Math.max(0, Math.round(toleranceMm))
      set({
        toleranceMm: clamped,
        ...recompute(get().poolSkus, get().allocatedQty, get().planOrder, get().container, clamped, get().selectedOrder),
      })
    },

    setContainer: (container) => {
      set({
        container,
        ...recompute(get().poolSkus, get().allocatedQty, get().planOrder, container, get().toleranceMm, get().selectedOrder),
      })
    },

    setSelectedOrder: (order) => set({ selectedOrder: order }),
  }
})
