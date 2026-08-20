import { useContainerStore, TOP_N } from './store/useContainerStore'
import { Scene } from './viewer/Scene'
import { SkuTable } from './ui/SkuTable'
import { MetricsPanel } from './ui/MetricsPanel'
import { ContainerPicker } from './ui/ContainerPicker'

export default function App() {
  const {
    skus,
    container,
    toleranceMm,
    rankedConfigs,
    selectedOrder,
    setSkuQty,
    setSkuPriority,
    setToleranceMm,
    setContainer,
    setSelectedOrder,
  } = useContainerStore()

  const selected = rankedConfigs.find((c) => c.order === selectedOrder) ?? rankedConfigs[0]
  const top3 = rankedConfigs.slice(0, TOP_N)

  return (
    <div className="h-full w-full flex bg-slate-950">
      <aside className="w-80 shrink-0 overflow-y-auto p-4 border-r border-slate-800 space-y-4">
        <ContainerPicker container={container} onChange={setContainer} />

        <div>
          <h2 className="text-slate-100 font-semibold mb-3">SKUs</h2>
          <SkuTable skus={skus} onQtyChange={setSkuQty} onPriorityChange={setSkuPriority} />
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
          skus={skus}
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
