import type { Box, ContainerSpec } from '../types'

export interface Aabb {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

export function boxAabb(box: Box): Aabb {
  return {
    minX: box.x,
    minY: box.y,
    minZ: box.z,
    maxX: box.x + box.l,
    maxY: box.y + box.w,
    maxZ: box.z + box.h,
  }
}

/** True if the two AABBs overlap with positive volume (touching faces do not count as intersecting). */
export function aabbIntersects(a: Aabb, b: Aabb): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  )
}

export function isWithinContainer(box: Box, container: ContainerSpec): boolean {
  return (
    box.x >= 0 &&
    box.y >= 0 &&
    box.z >= 0 &&
    box.x + box.l <= container.l &&
    box.y + box.w <= container.w &&
    box.z + box.h <= container.h
  )
}

/** Footprint (X-Y rectangle) overlap, used for the floating/support check. */
export function footprintOverlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.w && a.y + a.w > b.y
}
