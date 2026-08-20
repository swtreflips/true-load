import { mm, type ContainerSpec, type SKU } from '../engine/types'

/**
 * A 1m cube container and a 0.5m cube box: exactly 8 boxes fit in a perfect 2x2x2 grid with
 * zero remainder — hand-verified. The known-answer fixture for "does the packer agree with
 * arithmetic" (CLAUDE.md rule 4).
 */
export const GRID_CONTAINER: ContainerSpec = {
  id: 'grid-test',
  name: '1m test cube',
  l: mm(1000),
  w: mm(1000),
  h: mm(1000),
  source: 'synthetic fixture',
}

export const GRID_SKU: SKU = {
  id: 'grid-box',
  name: 'Grid box',
  l: mm(500),
  w: mm(500),
  h: mm(500),
  qty: 8,
  allowedOrientations: [0],
  priority: true,
}

/**
 * Same box, but the container height is 1mm short of fitting the second 500mm layer
 * (999mm vs. the 1000mm needed for two 500mm layers). Only the first layer (4 boxes) fits;
 * the second layer's 4 boxes are unplaced. Hand-verified by simulating the shelf cursor.
 */
export const GRID_CONTAINER_SHORT: ContainerSpec = {
  ...GRID_CONTAINER,
  id: 'grid-test-short',
  h: mm(999),
}

export const SINGLE_BOX_CONTAINER: ContainerSpec = {
  id: 'single-box-test',
  name: 'Single box test container',
  l: mm(1000),
  w: mm(1000),
  h: mm(1000),
  source: 'synthetic fixture',
}

export const SINGLE_SKU: SKU = {
  id: 'single-box',
  name: 'Single box',
  l: mm(400),
  w: mm(300),
  h: mm(200),
  qty: 1,
  allowedOrientations: [0],
  priority: true,
}

/**
 * A container whose cross-section fits exactly 2x2=4 boxes per column (one "complete column" =
 * one full perY x perZ rectangular block), with plenty of length for many columns. Paired with
 * PARTIAL_COLUMN_SKU's qty=10, this hand-verifies the priority flag's rounding behaviour: 10
 * boxes is 2 full columns (8) plus a remainder of 2 that doesn't complete a third column.
 * Defaults to priority: true (round up, place all 10) -- tests spread `{ ...PARTIAL_COLUMN_SKU,
 * priority: false }` to exercise the round-down/hold-back behaviour.
 */
export const PARTIAL_COLUMN_CONTAINER: ContainerSpec = {
  id: 'partial-column-test',
  name: 'Partial column test container',
  l: mm(1000),
  w: mm(200),
  h: mm(200),
  source: 'synthetic fixture',
}

export const PARTIAL_COLUMN_SKU: SKU = {
  id: 'partial-column-box',
  name: 'Partial column box',
  l: mm(100),
  w: mm(100),
  h: mm(100),
  qty: 10,
  allowedOrientations: [0],
  priority: true,
}
