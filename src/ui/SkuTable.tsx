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
 * The plan tray: what's been committed to the container, **in the sequence the user built it in**
 * (sku.qty here is the allocated amount, not the pool total -- see SkuPoolTray for that).
 *
 * Row order is a real control, not presentation. `pack()` walks its input front-to-back with one
 * length cursor, so row 1 gets first claim on the container's length and later rows only see
 * what's left -- which is why each row carries its position number and arrows to move it. The
 * 'as-entered' strategy packs exactly this order, putting the planner's own judgment into the
 * ranked comparison against the five computed heuristics rather than leaving it out of the running.
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
  onMove,
  onRemove,
}: {
  skus: SKU[]
  maxQty: Record<string, number>
  placedQty: Record<string, number>
  placedFootprintBySku: Record<string, PlacedFootprint>
  onQtyChange: (skuId: string, qty: number) => void
  onPriorityChange: (skuId: string, priority: boolean) => void
  onAllowRotationChange: (skuId: string, allowRotation: boolean) => void
  onMove: (skuId: string, delta: -1 | 1) => void
  onRemove: (skuId: string) => void
}) {
  if (skus.length === 0) {
    return (
      <div className="border border-dashed border-rivet rounded px-3 py-6 text-center text-sm text-steel">
        Nothing planned yet.
        <div className="text-xs text-steel/70 mt-1">
          Add SKUs from the pool above. The order you add them in is the order they're loaded.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-manifest">
        <thead>
          <tr className="text-left text-steel border-b border-rivet text-xs uppercase tracking-wide">
            <th className="py-1 pr-2 font-medium" title="Loading sequence — row 1 claims container length first">
              # Item
            </th>
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
            <th
              className="py-1 pr-2 text-right font-medium whitespace-nowrap"
              title="How many of the allocated units actually fit in the container"
            >
              In cont.
            </th>
            <th className="py-1 pr-2 text-right font-medium" title="Placed footprint L×W×H in mm. Hover a row for its per-case volume.">
              Dims
            </th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {skus.map((sku, index) => {
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
                    <span className="flex flex-col leading-none shrink-0">
                      <button
                        disabled={index === 0}
                        onClick={() => onMove(sku.id, -1)}
                        title="Load earlier — claims container length sooner"
                        aria-label={`Move ${sku.name} earlier in the loading sequence`}
                        className="text-[8px] text-steel hover:text-cargo-yellow disabled:opacity-20 disabled:hover:text-steel focus:outline-none focus:ring-1 focus:ring-cargo-yellow/60 rounded-sm"
                      >
                        ▲
                      </button>
                      <button
                        disabled={index === skus.length - 1}
                        onClick={() => onMove(sku.id, 1)}
                        title="Load later — takes whatever length is left"
                        aria-label={`Move ${sku.name} later in the loading sequence`}
                        className="text-[8px] text-steel hover:text-cargo-yellow disabled:opacity-20 disabled:hover:text-steel focus:outline-none focus:ring-1 focus:ring-cargo-yellow/60 rounded-sm"
                      >
                        ▼
                      </button>
                    </span>
                    <span className="font-mono text-[10px] text-steel tabular-nums shrink-0">{index + 1}</span>
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: skuColorCss(sku.id) }} />
                    <span className="truncate" title={sku.name}>
                      {sku.name}
                    </span>
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
                  className="py-1.5 pr-2 text-right font-mono tabular-nums text-xs whitespace-nowrap"
                  title={
                    (rotated ? `Rotated: ${sku.l}×${sku.w} as entered → ${dimsL}×${dimsW} fits more per row. ` : '') +
                    `${volumeM3(sku).toFixed(4)} m³ per case`
                  }
                >
                  <span className={rotated ? 'text-cargo-yellow' : 'text-steel'}>
                    {dimsL}×{dimsW}×{sku.h}
                    {rotated && ' ⟲'}
                  </span>
                </td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => onRemove(sku.id)}
                    title="Remove from the plan and return its units to the pool"
                    aria-label={`Remove ${sku.name} from the plan`}
                    className="text-xs px-1 text-steel hover:text-rust focus:outline-none focus:ring-1 focus:ring-cargo-yellow/60 rounded"
                  >
                    ×
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
