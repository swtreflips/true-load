import { ALL_CONTAINERS, theoreticalCapacityMm3 } from '../engine/containers'
import { PanelHeader } from './PanelHeader'
import type { ContainerSpec } from '../engine/types'

const MM3_PER_M3 = 1_000_000_000

export function ContainerPicker({
  container,
  onChange,
}: {
  container: ContainerSpec
  onChange: (container: ContainerSpec) => void
}) {
  return (
    <div>
      <PanelHeader title="Container" />
      <select
        value={container.id}
        onChange={(e) => {
          const next = ALL_CONTAINERS.find((c) => c.id === e.target.value)
          if (next) onChange(next)
        }}
        className="w-full bg-deck border border-rivet rounded px-1.5 py-1 text-manifest font-mono focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 focus:border-cargo-yellow"
      >
        {ALL_CONTAINERS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {(theoreticalCapacityMm3(c) / MM3_PER_M3).toFixed(1)} CBM
          </option>
        ))}
      </select>
      <div className="text-xs text-steel mt-1.5 font-mono">
        {container.l}×{container.w}×{container.h}mm usable
      </div>
      <div className="text-xs text-steel/70 mt-0.5">{container.source}</div>
    </div>
  )
}
