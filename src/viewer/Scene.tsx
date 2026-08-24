import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { ContainerWireframe } from './ContainerWireframe'
import { ContainerBoxes } from './ContainerBoxes'
import { containerToThreeSize } from './axisConversion'
import type { ContainerState } from '../engine/types'

export function Scene({ containerState }: { containerState: ContainerState }) {
  const [sizeX, sizeY, sizeZ] = containerToThreeSize(containerState.container)
  const center: [number, number, number] = [sizeX / 2, sizeY / 2, sizeZ / 2]
  const cameraDistance = Math.max(sizeX, sizeY, sizeZ) * 1.6
  const gridSize = Math.max(sizeX, sizeZ) * 2.5

  return (
    <Canvas
      camera={{
        position: [center[0] + cameraDistance, center[1] + cameraDistance * 0.6, center[2] + cameraDistance],
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
    >
      {/* Matches --color-hull */}
      <color attach="background" args={['#12181f']} />
      <hemisphereLight args={['#f8fafc', '#1e293b', 1.2]} />
      <directionalLight position={[center[0] + cameraDistance, center[1] + cameraDistance * 1.5, center[2] + cameraDistance]} intensity={2} />
      <directionalLight position={[center[0] - cameraDistance, center[1] + cameraDistance * 0.5, center[2] - cameraDistance]} intensity={0.6} />
      {/* Grounds the model instead of leaving it floating in empty space -- a technical-drawing
          floor reference, sized and centred on the container, not a decorative infinite plane. */}
      <Grid
        position={[center[0], 0, center[2]]}
        args={[gridSize, gridSize]}
        cellSize={Math.max(sizeX, sizeZ) / 20}
        cellThickness={0.5}
        cellColor="#2b3641"
        sectionSize={Math.max(sizeX, sizeZ) / 4}
        sectionThickness={1}
        sectionColor="#4a5560"
        fadeDistance={gridSize}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
      <ContainerWireframe container={containerState.container} />
      <ContainerBoxes boxes={containerState.boxes} />
      <OrbitControls target={center} />
    </Canvas>
  )
}
