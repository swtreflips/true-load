/**
 * Deterministic per-SKU color, shared between the 3D viewer (ContainerBoxes) and every UI table
 * that lists SKUs -- same hash, same hue, so a table row's swatch always matches that SKU's box
 * color in the 3D view. Pure (no three.js import) so ui/ can use it without pulling in the
 * viewer's dependencies; the viewer converts the hue to a THREE.Color itself.
 */
export const SKU_COLOR_SATURATION = 0.75
export const SKU_COLOR_LIGHTNESS = 0.55

export function hueForSku(skuId: string): number {
  let hash = 0
  for (let i = 0; i < skuId.length; i++) {
    hash = (hash * 31 + skuId.charCodeAt(i)) >>> 0
  }
  return hash % 360
}

/** CSS-ready color string for a table swatch's background-color. */
export function skuColorCss(skuId: string): string {
  return `hsl(${hueForSku(skuId)}deg ${SKU_COLOR_SATURATION * 100}% ${SKU_COLOR_LIGHTNESS * 100}%)`
}
