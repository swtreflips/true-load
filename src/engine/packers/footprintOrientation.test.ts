import { describe, expect, it } from 'vitest'
import { chooseFootprint } from './footprintOrientation'
import { ROTATION_BENEFIT_CONTAINER, ROTATION_BENEFIT_SKU, SINGLE_BOX_CONTAINER, SINGLE_SKU } from '../../fixtures/knownAnswers'

describe('chooseFootprint', () => {
  it('picks the rotated footprint when it places strictly more units (hand-verified: 63 vs 60 capacity, qty 61)', () => {
    const choice = chooseFootprint(ROTATION_BENEFIT_SKU, ROTATION_BENEFIT_CONTAINER, 0, ROTATION_BENEFIT_CONTAINER.l)

    expect(choice.rotated).toBe(true)
    expect(choice.l).toBe(ROTATION_BENEFIT_SKU.w) // swapped
    expect(choice.w).toBe(ROTATION_BENEFIT_SKU.l)
    expect(choice.capacity.toPlace).toBe(61) // all of it -- as-entered could only ever place 60
  })

  it('keeps the as-entered footprint when allowRotation is false, even though rotating would help', () => {
    const locked = { ...ROTATION_BENEFIT_SKU, allowRotation: false }
    const choice = chooseFootprint(locked, ROTATION_BENEFIT_CONTAINER, 0, ROTATION_BENEFIT_CONTAINER.l)

    expect(choice.rotated).toBe(false)
    expect(choice.l).toBe(locked.l)
    expect(choice.w).toBe(locked.w)
    expect(choice.capacity.toPlace).toBe(60) // the as-entered ceiling -- 1 unit short of qty 61
  })

  it('does not rotate when it would not help (ties go to as-entered)', () => {
    // SINGLE_SKU (400x300) in a 1000^3 container: qty is 1, so both orientations trivially fit
    // one box -- a tie, which should keep the as-entered orientation.
    const allowRotated = { ...SINGLE_SKU, allowRotation: true }
    const choice = chooseFootprint(allowRotated, SINGLE_BOX_CONTAINER, 0, SINGLE_BOX_CONTAINER.l)

    expect(choice.rotated).toBe(false)
    expect(choice.l).toBe(SINGLE_SKU.l)
    expect(choice.w).toBe(SINGLE_SKU.w)
  })

  it('never considers rotation for a square footprint (l === w)', () => {
    const square = { ...ROTATION_BENEFIT_SKU, w: ROTATION_BENEFIT_SKU.l, allowRotation: true }
    const choice = chooseFootprint(square, ROTATION_BENEFIT_CONTAINER, 0, ROTATION_BENEFIT_CONTAINER.l)

    expect(choice.rotated).toBe(false)
  })
})
