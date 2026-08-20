import { describe, expect, it } from 'vitest'
import { pack } from './shelfPacker'
import { validate } from '../validate'
import {
  GRID_CONTAINER,
  GRID_CONTAINER_SHORT,
  GRID_SKU,
  PARTIAL_COLUMN_CONTAINER,
  PARTIAL_COLUMN_SKU,
  SINGLE_BOX_CONTAINER,
  SINGLE_SKU,
} from '../../fixtures/knownAnswers'

describe('shelfPacker known-answer fixtures', () => {
  // Zero tolerance throughout: these fixtures are about exact placement arithmetic, not the
  // carton-bulge realism feature (see lossAttribution.test.ts for tolerance behaviour).
  it('fits exactly 8 boxes in a perfect 2x2x2 grid with 100% utilisation', () => {
    const { state, violations } = pack([GRID_SKU], GRID_CONTAINER, 'as-entered', 0)

    expect(state.boxes).toHaveLength(8)
    expect(state.unplaced).toHaveLength(0)
    expect(violations).toHaveLength(0)

    const loadedVolume = state.boxes.reduce((sum, b) => sum + b.l * b.w * b.h, 0)
    const containerVolume = GRID_CONTAINER.l * GRID_CONTAINER.w * GRID_CONTAINER.h
    expect(loadedVolume).toBe(containerVolume)
  })

  it('drops the second layer entirely when the container is 1mm too short for it', () => {
    const { state, violations } = pack([GRID_SKU], GRID_CONTAINER_SHORT, 'as-entered', 0)

    expect(state.boxes).toHaveLength(4)
    expect(state.unplaced).toEqual([{ skuId: GRID_SKU.id, qty: 4 }])
    expect(violations).toHaveLength(0)
    expect(state.boxes.every((b) => b.z === 0)).toBe(true)
  })

  it('places a single box at the origin', () => {
    const { state, violations } = pack([SINGLE_SKU], SINGLE_BOX_CONTAINER, 'as-entered', 0)

    expect(state.boxes).toHaveLength(1)
    expect(state.boxes[0]).toMatchObject({ x: 0, y: 0, z: 0, l: SINGLE_SKU.l, w: SINGLE_SKU.w, h: SINGLE_SKU.h })
    expect(violations).toHaveLength(0)
  })

  it('produces boxes validate() agrees are physically plausible', () => {
    const { state } = pack([GRID_SKU], GRID_CONTAINER, 'as-entered', 0)
    expect(validate(state)).toHaveLength(0)
  })
})

describe('per-SKU priority: rounding behaviour for a trailing partial column', () => {
  // PARTIAL_COLUMN_SKU: qty 10, 4 boxes per column (2x2 cross-section), plenty of length.
  // 10 = 2 complete columns (8) + a remainder of 2 that doesn't complete a third.

  it('priority (default true) rounds up: places all 10, wasting 2 empty slots in a 3rd column', () => {
    const { state, violations } = pack([PARTIAL_COLUMN_SKU], PARTIAL_COLUMN_CONTAINER, 'as-entered', 0)

    expect(PARTIAL_COLUMN_SKU.priority).toBe(true)
    expect(state.boxes).toHaveLength(10)
    expect(state.unplaced).toHaveLength(0)
    expect(state.slabs[0].columnsUsed).toBe(3)
    expect(violations).toHaveLength(0)
  })

  it('non-priority rounds down: places only the 8 that complete full columns', () => {
    const deprioritized = { ...PARTIAL_COLUMN_SKU, priority: false }
    const { state, violations } = pack([deprioritized], PARTIAL_COLUMN_CONTAINER, 'as-entered', 0)

    expect(state.boxes).toHaveLength(8)
    expect(state.unplaced).toEqual([{ skuId: deprioritized.id, qty: 2 }])
    expect(state.slabs[0].columnsUsed).toBe(2)
    // Length is only reserved for the 2 complete columns, not a wasted 3rd -- 200mm, not 300mm.
    expect(state.boxes.every((b) => b.x < 200)).toBe(true)
    expect(violations).toHaveLength(0)
  })
})
