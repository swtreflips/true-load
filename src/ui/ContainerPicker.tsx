import { ALL_CONTAINERS, theoreticalCapacityMm3 } from '../engine/containers'
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
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Container</div>
      <select
        value={container.id}
        onChange={(e) => {
          const next = ALL_CONTAINERS.find((c) => c.id === e.target.value)
          if (next) onChange(next)
        }}
        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100 focus:outline-none focus:border-slate-400"
      >
        {ALL_CONTAINERS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {(theoreticalCapacityMm3(c) / MM3_PER_M3).toFixed(1)} CBM
          </option>
        ))}
      </select>
      <div className="text-xs text-slate-500 mt-1">
        {container.l}×{container.w}×{container.h}mm usable. {container.source}
      </div>
    </div>
  )
}
