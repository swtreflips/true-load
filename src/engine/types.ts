/**
 * Integer millimetres. All engine geometry is expressed in this unit — see CLAUDE.md rule 6.
 * Convert at the edges (CSV parsing, UI input) via `cm()` / `mm()`; never let float centimetres
 * leak into engine code.
 */
export type Mm = number & { readonly __brand: 'Mm' }

export function mm(value: number): Mm {
  return Math.round(value) as Mm
}

export function cm(value: number): Mm {
  return Math.round(value * 10) as Mm
}

/**
 * Orientation index 0-5, one of the six axis-aligned permutations of (l, w, h).
 * This pass only ever produces/consumes index 0 (as-given, upright) — D2's default is
 * upright-only and the shelf packer doesn't search rotations. The field exists so adding
 * rotation search later is additive, not a schema change.
 */
export type Orientation = 0 | 1 | 2 | 3 | 4 | 5

export interface Dimensions {
  l: Mm
  w: Mm
  h: Mm
}

export function applyOrientation(dims: Dimensions, orientation: Orientation): Dimensions {
  const { l, w, h } = dims
  switch (orientation) {
    case 0:
      return { l, w, h }
    case 1:
      return { l: w, w: l, h }
    case 2:
      return { l, w: h, h: w }
    case 3:
      return { l: h, w, h: l }
    case 4:
      return { l: w, w: h, h: l }
    case 5:
      return { l: h, w: l, h: w }
  }
}

export interface SKU {
  id: string
  name: string
  l: Mm
  w: Mm
  h: Mm
  qty: number
  /** Undefined means unknown, not zero — data.csv has no weight column. */
  weight?: number
  allowedOrientations: Orientation[]
  /**
   * Default true: this SKU's full quantity must be placed wherever geometrically possible, so
   * its slab rounds UP and fills a trailing partial column rather than leaving units out.
   * Marking a SKU non-priority (false) is what allows the packer to round DOWN instead --
   * holding back the units that don't complete a full column, to free that length for whatever
   * comes next. This is a per-SKU input the user sets deliberately, not something the base
   * ordering algorithm (PackOrder) decides on its own.
   */
  priority: boolean
  /**
   * Default true: the packer may swap this SKU's length and width (footprint rotation only --
   * the height axis, and which face is "up", never changes) if that fits more per row. Real
   * cartons sometimes can't be rotated even though the geometry would allow it -- a printed
   * face, a spout, a strap, a handling mark -- so this is a per-SKU override, not an assumption.
   */
  allowRotation: boolean
}

/** Position is the box's min corner, never its centre. */
export interface Box {
  id: string
  skuId: string
  x: Mm
  y: Mm
  z: Mm
  l: Mm
  w: Mm
  h: Mm
  orientation: Orientation
}

export interface ContainerSpec {
  id: string
  name: string
  /** Internal usable dimensions. */
  l: Mm
  w: Mm
  h: Mm
  source: string
}

export interface UnplacedEntry {
  skuId: string
  qty: number
}

/**
 * Geometric facts about one SKU's slab, captured during packing so `lossAttribution` can
 * exactly partition the container's volume without re-deriving packer-internal math. Effective
 * dims are the tolerance-inflated ones actually used for placement (see `pack`'s `toleranceMm`
 * param); nominal dims (on the SKU/Box) are the real cargo size.
 */
export interface SlabSummary {
  skuId: string
  /** Nominal (spec) dims -- the real cargo size, before tolerance. */
  l: Mm
  w: Mm
  h: Mm
  /** Effective (tolerance-inflated) dims actually used for placement. */
  effL: Mm
  effW: Mm
  effH: Mm
  /** Boxes per row across the container width, at effective width. */
  perY: number
  /** Boxes per layer up the container height, at effective height. */
  perZ: number
  /** Columns of length `effL` this slab actually consumes. */
  columnsUsed: number
  /** Boxes actually placed in this slab. */
  toPlace: number
  /** True if this slab's l/w were swapped from the SKU's as-entered dims (see SKU.allowRotation). */
  rotated: boolean
}

export interface ContainerState {
  schemaVersion: 1
  container: ContainerSpec
  boxes: Box[]
  unplaced: UnplacedEntry[]
  /** Box ids in the order they were placed. Powers the timeline scrubber (later milestone). */
  placementHistory: string[]
  /** Per-SKU slab geometry, in placement order. See `SlabSummary`. */
  slabs: SlabSummary[]
}

export type ViolationType = 'intersection' | 'out-of-bounds' | 'floating'

export interface Violation {
  type: ViolationType
  boxId: string
  detail: string
}

export interface PackResult {
  state: ContainerState
  violations: Violation[]
}
