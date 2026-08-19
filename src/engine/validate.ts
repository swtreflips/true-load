import { aabbIntersects, boxAabb, footprintOverlaps, isWithinContainer } from './geometry/aabb'
import type { ContainerState, Violation } from './types'

/**
 * Checks physical plausibility of a packed state: no intersections, no box out of bounds,
 * nothing floating. Returns violations rather than throwing (CLAUDE.md rule 7) so callers —
 * tests now, the viewer's violation overlay later — can inspect and render them instead of
 * crashing on a bad pack.
 */
export function validate(state: ContainerState): Violation[] {
  const violations: Violation[] = []
  const { boxes, container } = state

  for (const box of boxes) {
    if (!isWithinContainer(box, container)) {
      violations.push({
        type: 'out-of-bounds',
        boxId: box.id,
        detail: `Box exceeds container bounds (${container.l}x${container.w}x${container.h}mm).`,
      })
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (aabbIntersects(boxAabb(boxes[i]), boxAabb(boxes[j]))) {
        violations.push({
          type: 'intersection',
          boxId: boxes[i].id,
          detail: `Intersects box ${boxes[j].id}.`,
        })
      }
    }
  }

  for (const box of boxes) {
    if (box.z === 0) continue // resting on the container floor

    const footprintArea = box.l * box.w
    let supportedArea = 0
    for (const other of boxes) {
      if (other.id === box.id) continue
      if (other.z + other.h !== box.z) continue // top of `other` doesn't touch bottom of `box`
      if (!footprintOverlaps(box, other)) continue

      const overlapL = Math.min(box.x + box.l, other.x + other.l) - Math.max(box.x, other.x)
      const overlapW = Math.min(box.y + box.w, other.y + other.w) - Math.max(box.y, other.y)
      supportedArea += overlapL * overlapW
    }

    if (supportedArea < footprintArea) {
      violations.push({
        type: 'floating',
        boxId: box.id,
        detail: `Only ${((supportedArea / footprintArea) * 100).toFixed(1)}% of base area supported.`,
      })
    }
  }

  return violations
}
