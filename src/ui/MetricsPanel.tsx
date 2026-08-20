import { PACK_ORDER_LABEL, type PackOrder } from '../engine/packers/shelfPacker'
import type { RankedConfiguration } from '../engine/packers/rankConfigurations'
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
    <div className="text-slate-200 text-sm space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Carton tolerance</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={toleranceMm}
            onChange={(e) => onToleranceChange(Number(e.target.value))}
            className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right text-slate-100 focus:outline-none focus:border-slate-400"
          />
          <span className="text-slate-400">mm added per dimension</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Real cartons bulge and crews don't load to the millimetre — this space is reserved
          around every box for placement, not just subtracted from the total afterward.
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
          Top {top3.length} configurations
        </div>
        <div className="space-y-1">
          {top3.map((config, i) => {
            const isSelected = config.order === selectedOrder
            return (
              <button
                key={config.order}
                onClick={() => onSelectOrder(config.order)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded border text-left ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900 border-slate-100 font-medium'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{RANK_BADGE[i]}</span>
                  <span>{PACK_ORDER_LABEL[config.order]}</span>
                </span>
                <span className="tabular-nums">{(config.utilisation.utilisationRatio * 100).toFixed(1)}%</span>
              </button>
            )
          })}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Every strategy is packed and scored — none is assumed best. Ranked by utilisation across
          all six SKU-sequencing strategies this packer knows. Which SKUs must ship in full is set
          per-SKU in the table on the left ("Priority"), not part of this ranking.
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Loaded</div>
        <div className="text-2xl font-semibold">{selected.utilisation.loadedCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Theoretical capacity</div>
        <div className="text-2xl font-semibold">{selected.utilisation.theoreticalCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Utilisation</div>
        <div className="text-2xl font-semibold">{(selected.utilisation.utilisationRatio * 100).toFixed(1)}%</div>
        <div className="text-xs text-slate-500">Volume-only — not the full theoretical/geometric/loaded split yet.</div>
      </div>

      <LossBreakdownBar loss={selected.loss} />

      <div className="pt-2 border-t border-slate-700">
        <div className="text-xs uppercase tracking-wide text-slate-400">Boxes</div>
        <div>
          {selected.utilisation.boxesPlaced} placed
          {selected.utilisation.boxesUnplaced > 0 && (
            <span className="text-amber-400"> · {selected.utilisation.boxesUnplaced} unplaced</span>
          )}
        </div>
      </div>

      {selected.containerState.unplaced.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">What's left over</div>
          <ul className="space-y-0.5">
            {selected.containerState.unplaced.map((entry) => {
              const sku = findSku(skus, entry.skuId)
              return (
                <li key={entry.skuId} className="flex justify-between text-amber-300">
                  <span>
                    {sku?.name ?? entry.skuId}
                    {sku && !sku.priority && <span className="text-slate-500"> (deprioritized)</span>}
                  </span>
                  <span>{entry.qty}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className={selected.violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}>
        {selected.violations.length > 0 ? `${selected.violations.length} violation(s)` : 'No violations'}
      </div>
    </div>
  )
}
