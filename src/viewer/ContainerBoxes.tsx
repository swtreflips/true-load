import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { boxToThree } from './axisConversion'
import type { Box } from '../engine/types'

function hueForSku(skuId: string): number {
  let hash = 0
  for (let i = 0; i < skuId.length; i++) {
    hash = (hash * 31 + skuId.charCodeAt(i)) >>> 0
  }
  return hash % 360
}

function colorForSku(skuId: string): THREE.Color {
  return new THREE.Color().setHSL(hueForSku(skuId) / 360, 0.75, 0.55)
}

/**
 * Single instancedMesh for every box, positions written into the instance matrix directly
 * (not React state per box) -- PLAN.md §7 flags ~500 boxes as the threshold where per-box
 * React state kills frame rate, and data.csv already produces 1,550+ boxes.
 */
export function ContainerBoxes({ boxes }: { boxes: Box[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // instanceId -> boxId, kept for picking even though click-to-inspect isn't wired up yet
  // (PLAN.md §7: cheap to add now, expensive to retrofit).
  const instanceIdToBoxId = useMemo(() => boxes.map((b) => b.id), [boxes])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new THREE.Matrix4()
    boxes.forEach((box, i) => {
      const { position, scale } = boxToThree(box)
      matrix.compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion(),
        new THREE.Vector3(...scale),
      )
      mesh.setMatrixAt(i, matrix)
      mesh.setColorAt(i, colorForSku(box.skuId))
    })

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [boxes])

  if (boxes.length === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, boxes.length]} userData={{ instanceIdToBoxId }}>
      <boxGeometry args={[1, 1, 1]} />
      {/*
        No `vertexColors` here -- per-instance color via setColorAt()/mesh.instanceColor works
        automatically (three.js enables USE_INSTANCING_COLOR whenever instanceColor is set,
        independent of this flag). Setting vertexColors=true also enables the *per-vertex*
        USE_COLOR path, which multiplies by a geometry `color` attribute our boxGeometry
        doesn't have; the unbound attribute reads as (0,0,0) in WebGL, zeroing the instance
        color before it's even applied. That was rendering every box pure black regardless of
        lighting -- found by bisecting with an unlit material and pixel-sampling a screenshot.
      */}
      <meshStandardMaterial roughness={0.6} metalness={0} />
    </instancedMesh>
  )
}
