import { describe, expect, it } from 'vitest'
import { pack } from './shelfPacker'
import { validate } from '../validate'
import {
  GRID_CONTAINER,
  GRID_CONTAINER_SHORT,
  GRID_SKU,
  SINGLE_BOX_CONTAINER,
  SINGLE_SKU,
} from '../../fixtures/knownAnswers'

describe('shelfPacker known-answer fixtures', () => {
  it('fits exactly 8 boxes in a perfect 2x2x2 grid with 100% utilisation', () => {
    const { state, violations } = pack([GRID_SKU], GRID_CONTAINER)

    expect(state.boxes).toHaveLength(8)
    expect(state.unplaced).toHaveLength(0)
    expect(violations).toHaveLength(0)

    const loadedVolume = state.boxes.reduce((sum, b) => sum + b.l * b.w * b.h, 0)
    const containerVolume = GRID_CONTAINER.l * GRID_CONTAINER.w * GRID_CONTAINER.h
    expect(loadedVolume).toBe(containerVolume)
  })

  it('drops the second layer entirely when the container is 1mm too short for it', () => {
    const { state, violations } = pack([GRID_SKU], GRID_CONTAINER_SHORT)

    expect(state.boxes).toHaveLength(4)
    expect(state.unplaced).toEqual([{ skuId: GRID_SKU.id, qty: 4 }])
    expect(violations).toHaveLength(0)
    expect(state.boxes.every((b) => b.z === 0)).toBe(true)
  })

  it('places a single box at the origin', () => {
    const { state, violations } = pack([SINGLE_SKU], SINGLE_BOX_CONTAINER)

    expect(state.boxes).toHaveLength(1)
    expect(state.boxes[0]).toMatchObject({ x: 0, y: 0, z: 0, l: SINGLE_SKU.l, w: SINGLE_SKU.w, h: SINGLE_SKU.h })
    expect(violations).toHaveLength(0)
  })

  it('produces boxes validate() agrees are physically plausible', () => {
    const { state } = pack([GRID_SKU], GRID_CONTAINER)
    expect(validate(state)).toHaveLength(0)
  })
})
