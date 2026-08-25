import { skuColorCss } from '../theme/skuColor'
import type { SKU } from '../engine/types'

/**
 * The master list: the whole data.csv catalog, including SKUs that aren't production-ready yet --
 * a planner should be able to sketch a hypothetical load around something still in production.
 * Editing "Total" simulates a different order size. Nothing here is packed; "Add" pulls a SKU
 * into the plan (SkuTable), which is what actually reaches the container.
 */
export function SkuPoolTray({
  poolSkus,
  allocatedQty,
  plannedIds,
  onTotalChange,
  onAddToPlan,
}: {
  poolSkus: SKU[]
  allocatedQty: Record<string, number>
  plannedIds: Set<string>
  onTotalChange: (skuId: string, qty: number) => void
  onAddToPlan: (skuId: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-manifest">
        <thead>
          <tr className="text-left text-steel border-b border-rivet text-xs uppercase tracking-wide">
            <th className="py-1 pr-2 font-medium">Item</th>
            <th className="py-1 pr-2 text-right font-medium">Total</th>
            <th className="py-1 pr-2 text-right font-medium">Avail.</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {poolSkus.map((sku) => {
            const allocated = allocatedQty[sku.id] ?? 0
            const available = sku.qty - allocated
            const planned = plannedIds.has(sku.id)

            return (
              <tr key={sku.id} className={`border-b border-rivet/60 ${planned ? 'text-steel/60' : ''}`}>
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-sm shrink-0 ${planned ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: skuColorCss(sku.id) }}
                    />
                    {sku.name}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-right">
                  <input
                    type="number"
                    min={0}
                    value={sku.qty}
                    onChange={(e) => onTotalChange(sku.id, Number(e.target.value))}
                    className="w-16 bg-deck border border-rivet rounded px-1 py-0.5 text-right font-mono tabular-nums text-manifest focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 focus:border-cargo-yellow"
                  />
                </td>
                <td className={`py-1.5 pr-2 text-right font-mono tabular-nums ${available === 0 ? 'text-steel/50' : 'text-manifest'}`}>
                  {available}
                </td>
                <td className="py-1.5 text-right">
                  {planned ? (
                    <span className="text-xs text-steel/70 font-mono" title="Already in the plan below">
                      in plan
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddToPlan(sku.id)}
                      title="Add to the end of the plan with all units allocated"
                      className="text-xs px-1.5 py-0.5 rounded border border-rivet text-steel hover:bg-deck hover:text-manifest focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60"
                    >
                      Add →
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
