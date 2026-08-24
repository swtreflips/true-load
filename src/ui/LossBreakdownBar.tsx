import type { LossBreakdown } from '../engine/metrics/lossAttribution'

const MM3_PER_M3 = 1_000_000_000

// Warm ochre-to-rust ramp (loaded cargo in cargo-green, everything else a shade of loss),
// keeping the six categories distinguishable within the freight-yard palette rather than a
// generic chart-color set.
const SEGMENTS: { key: keyof LossBreakdown; label: string; color: string }[] = [
  { key: 'loadedMm3', label: 'Loaded (cargo)', color: '#6b9b5e' },
  { key: 'packingGapsMm3', label: 'Packing gaps (tolerance)', color: '#d99a3b' },
  { key: 'columnRoundingMm3', label: 'Column rounding', color: '#c1652f' },
  { key: 'boundaryLossMm3', label: 'Boundary loss (side wall)', color: '#a94a3d' },
  { key: 'ceilingLossMm3', label: 'Ceiling loss (roof)', color: '#8b5a6b' },
  { key: 'trailingLengthMm3', label: 'Trailing length (unallocated)', color: '#4a5560' },
]

/**
 * Visualizes the exact volume partition from `attributeLoss` -- this is "space between boxes
 * and leftover space" made concrete, per CLAUDE.md's "name the losses separately" principle.
 * The bar's segments always sum to the full container volume (see lossAttribution.test.ts).
 */
export function LossBreakdownBar({ loss }: { loss: LossBreakdown }) {
  const total = SEGMENTS.reduce((sum, seg) => sum + loss[seg.key], 0)
  if (total <= 0) return null

  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-steel mb-1">Where the volume goes</div>
      <div className="flex h-3 rounded overflow-hidden">
        {SEGMENTS.map((seg) => {
          const pct = (loss[seg.key] / total) * 100
          if (pct <= 0) return null
          return <div key={seg.key} style={{ width: `${pct}%`, backgroundColor: seg.color }} title={seg.label} />
        })}
      </div>
      <ul className="mt-2 space-y-0.5">
        {SEGMENTS.map((seg) => {
          const value = loss[seg.key]
          const pct = (value / total) * 100
          return (
            <li key={seg.key} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-manifest/90">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="font-mono tabular-nums text-steel">
                {(value / MM3_PER_M3).toFixed(2)} CBM · {pct.toFixed(1)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
