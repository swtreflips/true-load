import type { SKU } from '../engine/types'

function volumeM3(sku: SKU): number {
  return (sku.l * sku.w * sku.h) / 1_000_000_000
}

export function SkuTable({ skus }: { skus: SKU[] }) {
  return (
    <table className="w-full text-sm text-slate-200">
      <thead>
        <tr className="text-left text-slate-400 border-b border-slate-700">
          <th className="py-1 pr-2">Item</th>
          <th className="py-1 pr-2 text-right">Qty</th>
          <th className="py-1 pr-2 text-right">L×W×H (mm)</th>
          <th className="py-1 text-right">Vol (m³)</th>
        </tr>
      </thead>
      <tbody>
        {skus.map((sku) => (
          <tr key={sku.id} className="border-b border-slate-800">
            <td className="py-1 pr-2">{sku.name}</td>
            <td className="py-1 pr-2 text-right">{sku.qty}</td>
            <td className="py-1 pr-2 text-right">
              {sku.l}×{sku.w}×{sku.h}
            </td>
            <td className="py-1 text-right">{volumeM3(sku).toFixed(4)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
