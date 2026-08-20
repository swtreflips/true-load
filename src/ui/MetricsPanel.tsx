import type { PackOrder } from '../engine/packers/shelfPacker'
import type { OrderResult } from '../store/useContainerStore'
import type { SKU } from '../engine/types'

const ORDER_LABEL: Record<PackOrder, string> = {
  'as-entered': 'As entered',
  'optimal-density': 'Optimal order',
}

function skuName(skus: SKU[], skuId: string): string {
  return skus.find((s) => s.id === skuId)?.name ?? skuId
}

export function MetricsPanel({
  skus,
  activeOrder,
  active,
  comparisonOrder,
  comparison,
  onOrderChange,
}: {
  skus: SKU[]
  activeOrder: PackOrder
  active: OrderResult
  comparisonOrder: PackOrder
  comparison: OrderResult
  onOrderChange: (order: PackOrder) => void
}) {
  const delta = (comparison.utilisation.utilisationRatio - active.utilisation.utilisationRatio) * 100

  return (
    <div className="text-slate-200 text-sm space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Sequence</div>
        <div className="flex rounded overflow-hidden border border-slate-700">
          {(['as-entered', 'optimal-density'] as const).map((order) => (
            <button
              key={order}
              onClick={() => onOrderChange(order)}
              className={`flex-1 px-2 py-1 text-xs ${
                order === activeOrder ? 'bg-slate-100 text-slate-900 font-medium' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {ORDER_LABEL[order]}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          "Optimal order" allocates length to the SKU that delivers the most volume per mm first —
          optimal for this packer's slab strategy, not a global packing optimum.
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Loaded</div>
        <div className="text-2xl font-semibold">{active.utilisation.loadedCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Theoretical capacity</div>
        <div className="text-2xl font-semibold">{active.utilisation.theoreticalCbm.toFixed(2)} CBM</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">Utilisation</div>
        <div className="text-2xl font-semibold">{(active.utilisation.utilisationRatio * 100).toFixed(1)}%</div>
        <div className="text-xs text-slate-500">Volume-only — not the full theoretical/geometric/loaded split yet.</div>
        {Math.abs(delta) > 0.05 && (
          <div className={`text-xs mt-1 ${delta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {ORDER_LABEL[comparisonOrder]} would be {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}pt {delta > 0 ? 'better' : 'worse'} ({(comparison.utilisation.utilisationRatio * 100).toFixed(1)}%)
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700">
        <div className="text-xs uppercase tracking-wide text-slate-400">Boxes</div>
        <div>
          {active.utilisation.boxesPlaced} placed
          {active.utilisation.boxesUnplaced > 0 && (
            <span className="text-amber-400"> · {active.utilisation.boxesUnplaced} unplaced</span>
          )}
        </div>
      </div>

      {active.unplaced.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">What's left over</div>
          <ul className="space-y-0.5">
            {active.unplaced.map((entry) => (
              <li key={entry.skuId} className="flex justify-between text-amber-300">
                <span>{skuName(skus, entry.skuId)}</span>
                <span>{entry.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={active.violations.length > 0 ? 'text-red-400' : 'text-emerald-400'}>
        {active.violations.length > 0 ? `${active.violations.length} violation(s)` : 'No violations'}
      </div>
    </div>
  )
}
