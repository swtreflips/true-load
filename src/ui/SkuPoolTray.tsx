import type { SKU } from '../engine/types'

/**
 * The data.csv catalog, before anything is committed to the container. Editing "Total" here
 * simulates a different order size; "Available" is what's left after allocation. Nothing here
 * is packed -- see SkuTable (the allocation tray) for what actually reaches the container.
 */
export function SkuPoolTray({
  poolSkus,
  allocatedQty,
  onTotalChange,
  onAllocateAll,
}: {
  poolSkus: SKU[]
  allocatedQty: Record<string, number>
  onTotalChange: (skuId: string, qty: number) => void
  onAllocateAll: (skuId: string) => void
}) {
  return (
    <table className="w-full text-sm text-slate-200">
      <thead>
        <tr className="text-left text-slate-400 border-b border-slate-700">
          <th className="py-1 pr-2">Item</th>
          <th className="py-1 pr-2 text-right">Total</th>
          <th className="py-1 pr-2 text-right">Available</th>
          <th className="py-1" />
        </tr>
      </thead>
      <tbody>
        {poolSkus.map((sku) => {
          const allocated = allocatedQty[sku.id] ?? 0
          const available = sku.qty - allocated

          return (
            <tr key={sku.id} className="border-b border-slate-800">
              <td className="py-1 pr-2">{sku.name}</td>
              <td className="py-1 pr-2 text-right">
                <input
                  type="number"
                  min={0}
                  value={sku.qty}
                  onChange={(e) => onTotalChange(sku.id, Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-right text-slate-100 focus:outline-none focus:border-slate-400"
                />
              </td>
              <td className={`py-1 pr-2 text-right ${available === 0 ? 'text-slate-600' : 'text-slate-200'}`}>{available}</td>
              <td className="py-1 text-right">
                <button
                  disabled={available === 0}
                  onClick={() => onAllocateAll(sku.id)}
                  title="Allocate every available unit into the container"
                  className="text-xs px-1.5 py-0.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  Load all →
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
