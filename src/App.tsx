import { useContainerStore, toAllocatedSkus, TOP_N } from './store/useContainerStore'
import { Scene } from './viewer/Scene'
import { SkuPoolTray } from './ui/SkuPoolTray'
import { SkuTable } from './ui/SkuTable'
import { MetricsPanel } from './ui/MetricsPanel'
import { ContainerPicker } from './ui/ContainerPicker'
import { PanelHeader } from './ui/PanelHeader'

export default function App() {
  const {
    poolSkus,
    planOrder,
    allocatedQty,
    container,
    toleranceMm,
    rankedConfigs,
    selectedOrder,
    setPoolQty,
    setAllocatedQty,
    addToPlan,
    removeFromPlan,
    movePlanItem,
    setSkuPriority,
    setSkuAllowRotation,
    setToleranceMm,
    setContainer,
    setSelectedOrder,
  } = useContainerStore()

  const allocatedSkus = toAllocatedSkus(poolSkus, allocatedQty, planOrder)
  const maxQty = Object.fromEntries(poolSkus.map((sku) => [sku.id, sku.qty]))
  const plannedIds = new Set(planOrder)

  const selected = rankedConfigs.find((c) => c.order === selectedOrder) ?? rankedConfigs[0]
  const top3 = rankedConfigs.slice(0, TOP_N)

  // Allocated is intent; this is outcome -- how many of each SKU actually made it into the
  // container under the currently selected strategy, so the tray can show a shortfall instead
  // of implying everything allocated also got placed.
  const unplacedBySku = Object.fromEntries(selected.containerState.unplaced.map((u) => [u.skuId, u.qty]))
  const placedQty = Object.fromEntries(allocatedSkus.map((sku) => [sku.id, sku.qty - (unplacedBySku[sku.id] ?? 0)]))

  // Which footprint the packer actually chose per SKU (see footprintOrientation.ts) -- the tray
  // shows this instead of always the as-entered dims, so a rotation is visible, not silent.
  const placedFootprintBySku = Object.fromEntries(
    selected.containerState.slabs.map((slab) => [slab.skuId, { l: slab.l, w: slab.w, rotated: slab.rotated }]),
  )

  return (
    <div className="h-full w-full flex bg-hull font-sans">
      <aside className="w-[30rem] shrink-0 overflow-y-auto p-4 border-r border-rivet space-y-6">
        <ContainerPicker container={container} onChange={setContainer} />

        <div>
          <PanelHeader
            title="SKU master list"
            subtitle="Everything in the catalog, ready to ship or not. Add to plan below to include it."
          />
          <SkuPoolTray
            poolSkus={poolSkus}
            allocatedQty={allocatedQty}
            plannedIds={plannedIds}
            onTotalChange={setPoolQty}
            onAddToPlan={addToPlan}
          />
        </div>

        <div>
          <PanelHeader
            title="Loading plan"
            subtitle="Packed top to bottom — row 1 claims container length first. Reorder with ▲▼."
          />
          <SkuTable
            skus={allocatedSkus}
            maxQty={maxQty}
            placedQty={placedQty}
            placedFootprintBySku={placedFootprintBySku}
            onQtyChange={setAllocatedQty}
            onPriorityChange={setSkuPriority}
            onAllowRotationChange={setSkuAllowRotation}
            onMove={movePlanItem}
            onRemove={removeFromPlan}
          />
        </div>
      </aside>

      <main className="flex-1 relative">
        <Scene containerState={selected.containerState} />
        <div className="absolute top-3 left-3 text-manifest bg-deck/80 border border-rivet px-2 py-1 rounded text-sm font-mono">
          {selected.containerState.container.name}
        </div>
      </main>

      <aside className="w-80 shrink-0 overflow-y-auto p-4 border-l border-rivet">
        <PanelHeader title="Metrics" />
        <MetricsPanel
          skus={allocatedSkus}
          toleranceMm={toleranceMm}
          onToleranceChange={setToleranceMm}
          top3={top3}
          selectedOrder={selectedOrder}
          onSelectOrder={setSelectedOrder}
        />
      </aside>
    </div>
  )
}
