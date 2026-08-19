import { cm, type SKU } from '../engine/types'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Parses the `data.csv` shape (`Item,Quantity,Width,Depth,Height`, all dimensions in centimetres)
 * into engine SKUs. Width -> l, Depth -> w, Height -> h. No weight column, so `weight` is left
 * undefined (unknown), never defaulted to 0. Upright-only (D2 default) — orientation index 0.
 */
export function parseSkuCsv(csvText: string): SKU[] {
  const lines = csvText.trim().split(/\r?\n/)
  const [header, ...rows] = lines
  const columns = header.split(',').map((c) => c.trim().toLowerCase())

  const itemIdx = columns.indexOf('item')
  const qtyIdx = columns.indexOf('quantity')
  const widthIdx = columns.indexOf('width')
  const depthIdx = columns.indexOf('depth')
  const heightIdx = columns.indexOf('height')

  return rows
    .filter((row) => row.trim().length > 0)
    .map((row) => {
      const cells = row.split(',').map((c) => c.trim())
      const name = cells[itemIdx]
      return {
        id: slugify(name),
        name,
        l: cm(Number(cells[widthIdx])),
        w: cm(Number(cells[depthIdx])),
        h: cm(Number(cells[heightIdx])),
        qty: Number(cells[qtyIdx]),
        allowedOrientations: [0],
      } satisfies SKU
    })
}
