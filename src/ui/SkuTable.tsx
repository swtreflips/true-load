import { skuColorCss } from '../theme/skuColor'
import type { SKU } from '../engine/types'

interface PlacedFootprint {
  l: number
  w: number
  rotated: boolean
}

function volumeM3(sku: SKU): number {
  return (sku.l * sku.w * sku.h) / 1_000_000_000
}

/**
 * The allocation tray: what's actually been committed to the container (sku.qty here is the
 * allocated amount, not the pool total -- see SkuPoolTray for that). Editing "Allocated" moves
 * units back and forth against the pool automatically, clamped to what's available there.
 *
 * "Allocated" is intent, not outcome -- allocating more than the container can physically hold
 * is valid (the packer reports the remainder as unplaced) but shouldn't look, at a glance, like
 * everything made it in. `placedQty` carries the actual pack result so a shortfall is visible
 * right here, not just in the metrics panel on the other side of the screen. Likewise "Dims"
 * shows the footprint the packer actually chose (`placedFootprintBySku`, from
 * footprintOrientation.ts) -- a rotated SKU is flagged right in this row, not silently applied.
 */
export function SkuTable({
  skus,
  maxQty,
  placedQty,
  placedFootprintBySku,
  onQtyChange,
  onPriorityChange,
  onAllowRotationChange,
}: {
  skus: SKU[]
  maxQty: Record<string, number>
  placedQty: Record<string, number>
  placedFootprintBySku: Record<string, PlacedFootprint>
  onQtyChange: (skuId: string, qty: number) => void
  onPriorityChange: (skuId: string, priority: boolean) => void
  onAllowRotationChange: (skuId: string, allowRotation: boolean) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-manifest">
        <thead>
          <tr className="text-left text-steel border-b border-rivet text-xs uppercase tracking-wide">
            <th className="py-1 pr-2 font-medium">Item</th>
            <th
              className="py-1 pr-2 text-center font-medium"
              title="Must ship in full. Deselect to let the packer hold back units that don't complete a full column."
            >
              Pri.
            </th>
            <th
              className="py-1 pr-2 text-center font-medium"
              title="Let the packer swap this SKU's length/width 90° if it fits more per row. Deselect if this SKU can't be turned (label, spout, handling marks)."
            >
              Rot.
            </th>
            <th className="py-1 pr-2 text-right font-medium">Alloc.</th>
            <th className="py-1 pr-2 text-right font-medium" title="How many of the allocated units actually fit in the container">
              In cont.
            </th>
            <th className="py-1 pr-2 text-right font-medium">Dims</th>
            <th className="py-1 text-right font-medium">Vol</th>
          </tr>
        </thead>
        <tbody>
          {skus.map((sku) => {
            const placed = placedQty[sku.id] ?? 0
            const short = sku.qty - placed
            const footprint = placedFootprintBySku[sku.id]
            const rotated = footprint?.rotated ?? false
            const dimsL = footprint?.l ?? sku.l
            const dimsW = footprint?.w ?? sku.w

            return (
              <tr key={sku.id} className="border-b border-rivet/60">
                <td className="py-1.5 pr-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: skuColorCss(sku.id) }} />
                    {sku.name}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <input
                    type="checkbox"
                    checked={sku.priority}
                    onChange={(e) => onPriorityChange(sku.id, e.target.checked)}
                    title={sku.priority ? 'Must ship in full' : 'May hold back units to complete a full column'}
                    className="focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 rounded"
                  />
                </td>
                <td className="py-1.5 pr-2 text-center">
                  <input
                    type="checkbox"
                    checked={sku.allowRotation}
                    onChange={(e) => onAllowRotationChange(sku.id, e.target.checked)}
                    title={sku.allowRotation ? 'May rotate footprint 90° if it fits more' : 'Locked to as-entered orientation'}
                    className="focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 rounded"
                  />
                </td>
                <td className="py-1.5 pr-2 text-right">
                  <input
                    type="number"
                    min={0}
                    max={maxQty[sku.id] ?? 0}
                    value={sku.qty}
                    onChange={(e) => onQtyChange(sku.id, Number(e.target.value))}
                    className={`w-16 bg-deck border rounded px-1 py-0.5 text-right font-mono tabular-nums text-manifest focus:outline-none focus:ring-2 focus:ring-cargo-yellow/60 focus:border-cargo-yellow ${
                      short > 0 ? 'border-rust' : 'border-rivet'
                    }`}
                  />
                </td>
                <td
                  className={`py-1.5 pr-2 text-right font-mono tabular-nums ${short > 0 ? 'text-rust' : 'text-manifest'}`}
                  title={short > 0 ? `${short} didn't fit` : 'All allocated units fit'}
                >
                  {placed}
                  {short > 0 && <span className="text-rust/80"> (-{short})</span>}
                </td>
                <td
                  className="py-1.5 pr-2 text-right font-mono tabular-nums text-xs"
                  title={rotated ? `Rotated: ${sku.l}×${sku.w} as entered → ${dimsL}×${dimsW} fits more per row` : undefined}
                >
                  <span className={rotated ? 'text-cargo-yellow' : 'text-steel'}>
                    {dimsL}×{dimsW}×{sku.h}
                    {rotated && ' ⟲'}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums text-xs text-steel">{volumeM3(sku).toFixed(4)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
