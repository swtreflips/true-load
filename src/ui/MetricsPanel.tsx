import { PACK_ORDER_LABEL, type PackOrder } from '../engine/packers/shelfPacker'
import type { RankedConfiguration } from '../engine/packers/rankConfigurations'
import { skuColorCss } from '../theme/skuColor'
import type { SKU } from '../engine/types'
import { LossBreakdownBar } from './LossBreakdownBar'

const RANK_BADGE = ['#1', '#2', '#3']

function findSku(skus: SKU[], skuId: string): SKU | undefined {
  return skus.find((s) => s.id === skuId)
}

export function MetricsPanel({
  skus,
  toleranceMm,
  onToleranceChange,
  top3,
  selectedOrder,
  onSelectOrder,
}: {
  skus: SKU[]
  toleranceMm: number
  onToleranceChange: (toleranceMm: number) => void
  top3: RankedConfiguration[]
  selectedOrder: PackOrder
  onSelectOrder: (order: PackOrder) => void
}) {
  const selected = top3.find((c) => c.order === selectedOrder) ?? top3[0]

  return (
    <div className="text-manifest text-sm space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wide text-steel mb-1">Carton tolerance</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={toleranceMm}
            onChange={(e) => onToleranceChange(Number(e.target.value))}
            className="w-16 bg-deck border border-rivet rounded px-1 py-0.5 text-right font-mono tabular-nums text-manifest focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 focus:border-cargo-yellow"
          />
          <span className="text-steel">mm added per dimension</span>
        </div>
        <div className="text-xs text-steel/80 mt-1">
          Real cartons bulge and crews don't load to the millimetre — this space is reserved
          around every box for placement, not just subtracted from the total afterward.
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-steel mb-1">Top {top3.length} configurations</div>
        <div className="space-y-1">
          {top3.map((config, i) => {
            const isSelected = config.order === selectedOrder
            return (
              <button
                key={config.order}
                onClick={() => onSelectOrder(config.order)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-left transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 ${
                  isSelected
                    ? 'bg-cargo-yellow/10 text-manifest border-cargo-yellow font-medium'
                    : 'bg-deck text-steel border-rivet hover:bg-rivet/40 hover:text-manifest'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs text-steel">{RANK_BADGE[i]}</span>
                  <span>{PACK_ORDER_LABEL[config.order]}</span>
                </span>
                <span className="font-mono tabular-nums">{(config.utilisation.utilisationRatio * 100).toFixed(1)}%</span>
              </button>
            )
          })}
        </div>
        <div className="text-xs text-steel/80 mt-1">
          Every strategy is packed and scored — none is assumed best. Ranked by utilisation across
          all six SKU-sequencing strategies this packer knows. Which SKUs must ship in full is set
          per-SKU in the table on the left ("Priority"), not part of this ranking.
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-steel">Loaded</div>
        <div className="text-2xl font-semibold font-mono tabular-nums">{selected.utilisation.loadedCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-steel">Theoretical capacity</div>
        <div className="text-2xl font-semibold font-mono tabular-nums">{selected.utilisation.theoreticalCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-steel">Utilisation</div>
        <div className="text-2xl font-semibold font-mono tabular-nums">{(selected.utilisation.utilisationRatio * 100).toFixed(1)}%</div>
        <div className="text-xs text-steel/80">Volume-only — not the full theoretical/geometric/loaded split yet.</div>
      </div>

      <LossBreakdownBar loss={selected.loss} />

      <div className="pt-3 border-t border-rivet">
        <div className="text-xs uppercase tracking-wide text-steel">Boxes</div>
        <div className="font-mono tabular-nums">
          {selected.utilisation.boxesPlaced} placed
          {selected.utilisation.boxesUnplaced > 0 && (
            <span className="text-cargo-yellow"> · {selected.utilisation.boxesUnplaced} unplaced</span>
          )}
        </div>
      </div>

      {selected.containerState.unplaced.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-steel mb-1">What's left over</div>
          <ul className="space-y-0.5">
            {selected.containerState.unplaced.map((entry) => {
              const sku = findSku(skus, entry.skuId)
              return (
                <li key={entry.skuId} className="flex items-center justify-between text-cargo-yellow">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: skuColorCss(entry.skuId) }} />
                    {sku?.name ?? entry.skuId}
                    {sku && !sku.priority && <span className="text-steel"> (deprioritized)</span>}
                  </span>
                  <span className="font-mono tabular-nums">{entry.qty}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className={`font-mono ${selected.violations.length > 0 ? 'text-rust' : 'text-cargo-green'}`}>
        {selected.violations.length > 0 ? `${selected.violations.length} violation(s)` : 'No violations'}
      </div>
    </div>
  )
}
