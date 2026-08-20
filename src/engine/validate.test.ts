import { describe, expect, it } from 'vitest'
import { validate } from './validate'
import { mm, type Box, type ContainerState } from './types'

function stateWithBoxes(boxes: Box[]): ContainerState {
  return {
    schemaVersion: 1,
    container: { id: 'test', name: 'test', l: mm(1000), w: mm(1000), h: mm(1000), source: 'test' },
    boxes,
    unplaced: [],
    placementHistory: boxes.map((b) => b.id),
    slabs: [],
  }
}

function box(id: string, x: number, y: number, z: number, l = 100, w = 100, h = 100): Box {
  return { id, skuId: 'sku', x: mm(x), y: mm(y), z: mm(z), l: mm(l), w: mm(w), h: mm(h), orientation: 0 }
}

describe('validate floating check', () => {
  it('flags a box with any gap beneath it when supportGapMm is 0 (default)', () => {
    const state = stateWithBoxes([box('below', 0, 0, 0), box('above', 0, 0, 105)]) // 5mm gap
    const violations = validate(state)
    expect(violations.some((v) => v.type === 'floating' && v.boxId === 'above')).toBe(true)
  })

  it('does not flag a gap within supportGapMm as floating', () => {
    const state = stateWithBoxes([box('below', 0, 0, 0), box('above', 0, 0, 105)]) // 5mm gap
    const violations = validate(state, 5)
    expect(violations.some((v) => v.type === 'floating')).toBe(false)
  })

  it('still flags a gap larger than supportGapMm', () => {
    const state = stateWithBoxes([box('below', 0, 0, 0), box('above', 0, 0, 150)]) // 50mm gap
    const violations = validate(state, 5)
    expect(violations.some((v) => v.type === 'floating' && v.boxId === 'above')).toBe(true)
  })

  it('does not treat a box resting exactly on top as floating regardless of supportGapMm', () => {
    const state = stateWithBoxes([box('below', 0, 0, 0), box('above', 0, 0, 100)]) // touching exactly
    expect(validate(state, 0)).toHaveLength(0)
    expect(validate(state, 5)).toHaveLength(0)
  })
})
