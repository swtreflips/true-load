import { useContainerStore } from './store/useContainerStore'
import { Scene } from './viewer/Scene'
import { SkuTable } from './ui/SkuTable'
import { MetricsPanel } from './ui/MetricsPanel'

export default function App() {
  const { skus, containerState, violations, utilisation } = useContainerStore()

  return (
    <div className="h-full w-full flex bg-slate-950">
      <aside className="w-72 shrink-0 overflow-y-auto p-4 border-r border-slate-800">
        <h2 className="text-slate-100 font-semibold mb-3">SKUs</h2>
        <SkuTable skus={skus} />
      </aside>

      <main className="flex-1 relative">
        <Scene containerState={containerState} />
        <div className="absolute top-3 left-3 text-slate-100 bg-slate-900/70 px-2 py-1 rounded text-sm">
          {containerState.container.name}
        </div>
      </main>

      <aside className="w-64 shrink-0 overflow-y-auto p-4 border-l border-slate-800">
        <h2 className="text-slate-100 font-semibold mb-3">Metrics</h2>
        <MetricsPanel utilisation={utilisation} violations={violations} />
      </aside>
    </div>
  )
}
