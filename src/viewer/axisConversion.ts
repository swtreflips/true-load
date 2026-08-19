/**
 * The engine is Z-up (X=length, Y=width, Z=height), origin at the floor / wall opposite the
 * doors / left side looking in, box position = min corner (PLAN.md §4). Three.js is Y-up,
 * mesh position = centre. This file is the ONLY place that conversion happens — nothing else in
 * viewer/ should touch engine coordinates directly.
 *
 * Mapping: three.X = engine.x (length), three.Y = engine.z (height), three.Z = engine.y (width).
 * Millimetres are converted to metres for the scene (Three.js has no inherent unit, but metres
 * keep camera/light defaults sane).
 */
const MM_PER_M = 1000

export interface ThreeTransform {
  position: [number, number, number]
  scale: [number, number, number]
}

export function boxToThree(box: { x: number; y: number; z: number; l: number; w: number; h: number }): ThreeTransform {
  const centreX = box.x + box.l / 2
  const centreY = box.y + box.w / 2
  const centreZ = box.z + box.h / 2

  return {
    position: [centreX / MM_PER_M, centreZ / MM_PER_M, centreY / MM_PER_M],
    scale: [box.l / MM_PER_M, box.h / MM_PER_M, box.w / MM_PER_M],
  }
}

export function containerToThreeSize(container: { l: number; w: number; h: number }): [number, number, number] {
  return [container.l / MM_PER_M, container.h / MM_PER_M, container.w / MM_PER_M]
}
