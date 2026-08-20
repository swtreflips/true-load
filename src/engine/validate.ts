import { aabbIntersects, boxAabb, footprintOverlaps, isWithinContainer } from './geometry/aabb'
import type { ContainerState, Violation } from './types'

/**
 * Checks physical plausibility of a packed state: no intersections, no box out of bounds,
 * nothing floating. Returns violations rather than throwing (CLAUDE.md rule 7) so callers —
 * tests now, the viewer's violation overlay later — can inspect and render them instead of
 * crashing on a bad pack.
 *
 * `supportGapMm` is the largest vertical gap between a box's bottom and whatever's beneath it
 * that still counts as "resting on it" rather than floating. Default 0 means exact touching.
 * Pass the packer's carton tolerance here when validating a real pack: tolerance deliberately
 * reserves that much clearance around every box (CLAUDE.md §5), so a box sitting `toleranceMm`
 * above the one below it is accounted-for clearance, not a genuine physical bug -- a gap bigger
 * than that would still be flagged.
 */
export function validate(state: ContainerState, supportGapMm = 0): Violation[] {
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
      const gapToOtherTop = box.z - (other.z + other.h)
      if (gapToOtherTop < 0 || gapToOtherTop > supportGapMm) continue // `other` isn't (closely enough) beneath `box`
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
