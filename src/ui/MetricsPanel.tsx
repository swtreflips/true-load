import type { Utilisation } from '../engine/metrics/utilisation'
import type { Violation } from '../engine/types'

export function MetricsPanel({ utilisation, violations }: { utilisation: Utilisation; violations: Violation[] }) {
  return (
    <div className="text-slate-200 text-sm space-y-3">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Loaded</div>
        <div className="text-2xl font-semibold">{utilisation.loadedCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Theoretical capacity</div>
        <div className="text-2xl font-semibold">{utilisation.theoreticalCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Utilisation</div>
        <div className="text-2xl font-semibold">{(utilisation.utilisationRatio * 100).toFixed(1)}%</div>
        <div className="text-xs text-slate-500">Volume-only — not the full theoretical/geometric/loaded split yet.</div>
      </div>
      <div className="pt-2 border-t border-slate-700">
        <div className="text-xs uppercase tracking-wide text-slate-400">Boxes</div>
        <div>
          {utilisation.boxesPlaced} placed
          {utilisation.boxesUnplaced > 0 && <span className="text-amber-400"> · {utilisation.boxesUnplaced} unplaced</span>}
        </div>
      </div>
      <div className={violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}>
        {violations.length > 0 ? `${violations.length} violation(s)` : 'No violations'}
      </div>
    </div>
  )
}
