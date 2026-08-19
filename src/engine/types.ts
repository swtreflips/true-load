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

export interface ContainerState {
  schemaVersion: 1
  container: ContainerSpec
  boxes: Box[]
  unplaced: UnplacedEntry[]
  /** Box ids in the order they were placed. Powers the timeline scrubber (later milestone). */
  placementHistory: string[]
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
