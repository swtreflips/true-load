import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { ContainerWireframe } from './ContainerWireframe'
import { ContainerBoxes } from './ContainerBoxes'
import { containerToThreeSize } from './axisConversion'
import type { ContainerState } from '../engine/types'

export function Scene({ containerState }: { containerState: ContainerState }) {
  const [sizeX, sizeY, sizeZ] = containerToThreeSize(containerState.container)
  const center: [number, number, number] = [sizeX / 2, sizeY / 2, sizeZ / 2]
  const cameraDistance = Math.max(sizeX, sizeY, sizeZ) * 1.6

  return (
    <Canvas
      camera={{
        position: [center[0] + cameraDistance, center[1] + cameraDistance * 0.6, center[2] + cameraDistance],
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
    >
      <color attach="background" args={['#0f172a']} />
      <hemisphereLight args={['#f8fafc', '#1e293b', 1.2]} />
      <directionalLight position={[center[0] + cameraDistance, center[1] + cameraDistance * 1.5, center[2] + cameraDistance]} intensity={2} />
      <directionalLight position={[center[0] - cameraDistance, center[1] + cameraDistance * 0.5, center[2] - cameraDistance]} intensity={0.6} />
      <ContainerWireframe container={containerState.container} />
      <ContainerBoxes boxes={containerState.boxes} />
      <OrbitControls target={center} />
    </Canvas>
  )
}
