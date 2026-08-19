import { useMemo } from 'react'
import * as THREE from 'three'
import { containerToThreeSize } from './axisConversion'
import type { ContainerSpec } from '../engine/types'

export function ContainerWireframe({ container }: { container: ContainerSpec }) {
  const [sizeX, sizeY, sizeZ] = containerToThreeSize(container)

  const edges = useMemo(() => {
    const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ)
    return new THREE.EdgesGeometry(geometry)
  }, [sizeX, sizeY, sizeZ])

  return (
    <lineSegments position={[sizeX / 2, sizeY / 2, sizeZ / 2]} geometry={edges}>
      <lineBasicMaterial color="#94a3b8" />
    </lineSegments>
  )
}
