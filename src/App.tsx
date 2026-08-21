import { useContainerStore, toAllocatedSkus, TOP_N } from './store/useContainerStore'
import { Scene } from './viewer/Scene'
import { SkuPoolTray } from './ui/SkuPoolTray'
import { SkuTable } from './ui/SkuTable'
import { MetricsPanel } from './ui/MetricsPanel'
import { ContainerPicker } from './ui/ContainerPicker'

export default function App() {
  const {
    poolSkus,
    allocatedQty,
    container,
    toleranceMm,
    rankedConfigs,
    selectedOrder,
    setPoolQty,
    setAllocatedQty,
    allocateAll,
    setSkuPriority,
    setToleranceMm,
    setContainer,
    setSelectedOrder,
  } = useContainerStore()

  const allocatedSkus = toAllocatedSkus(poolSkus, allocatedQty)
  const maxQty = Object.fromEntries(poolSkus.map((sku) => [sku.id, sku.qty]))

  const selected = rankedConfigs.find((c) => c.order === selectedOrder) ?? rankedConfigs[0]
  const top3 = rankedConfigs.slice(0, TOP_N)

  return (
    <div className="h-full w-full flex bg-slate-950">
      <aside className="w-80 shrink-0 overflow-y-auto p-4 border-r border-slate-800 space-y-4">
        <ContainerPicker container={container} onChange={setContainer} />

        <div>
          <h2 className="text-slate-100 font-semibold mb-1">SKU pool</h2>
          <div className="text-xs text-slate-500 mb-2">From data.csv. Nothing here is loaded until it's allocated below.</div>
          <SkuPoolTray poolSkus={poolSkus} allocatedQty={allocatedQty} onTotalChange={setPoolQty} onAllocateAll={allocateAll} />
        </div>

        <div>
          <h2 className="text-slate-100 font-semibold mb-1">Allocated to container</h2>
          <div className="text-xs text-slate-500 mb-2">Only what's allocated here gets packed.</div>
          <SkuTable skus={allocatedSkus} maxQty={maxQty} onQtyChange={setAllocatedQty} onPriorityChange={setSkuPriority} />
        </div>
      </aside>

      <main className="flex-1 relative">
        <Scene containerState={selected.containerState} />
        <div className="absolute top-3 left-3 text-slate-100 bg-slate-900/70 px-2 py-1 rounded text-sm">
          {selected.containerState.container.name}
        </div>
      </main>

      <aside className="w-80 shrink-0 overflow-y-auto p-4 border-l border-slate-800">
        <h2 className="text-slate-100 font-semibold mb-3">Metrics</h2>
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
