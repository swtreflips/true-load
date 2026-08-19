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
      flat // disable ACES tone mapping/sRGB pipeline: at high intensity it pushes bright
      // surfaces toward white regardless of hue, which is what was washing out the per-SKU
      // colors. `flat` gives direct, predictable color output -- better suited to a tool
      // where distinguishing SKU colors matters more than photorealism.
      camera={{
        position: [center[0] + cameraDistance, center[1] + cameraDistance * 0.6, center[2] + cameraDistance],
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
    >
      <color attach="background" args={['#0f172a']} />
      <hemisphereLight args={['#f8fafc', '#1e293b', 1]} />
      <directionalLight position={[center[0] + cameraDistance, center[1] + cameraDistance * 1.5, center[2] + cameraDistance]} intensity={1.2} />
      <directionalLight position={[center[0] - cameraDistance, center[1] + cameraDistance * 0.5, center[2] - cameraDistance]} intensity={0.4} />
      <ContainerWireframe container={containerState.container} />
      <ContainerBoxes boxes={containerState.boxes} />
      <OrbitControls target={center} />
    </Canvas>
  )
}
