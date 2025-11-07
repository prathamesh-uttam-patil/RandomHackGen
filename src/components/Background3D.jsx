import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Icosahedron } from '@react-three/drei'

function FloatingOrb({ position, color }) {
  const meshRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005
      meshRef.current.rotation.y += 0.01
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3
    }
  })

  return (
    <Icosahedron ref={meshRef} position={position} args={[1, 0]}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.08}
        wireframe
        emissive={color}
        emissiveIntensity={0.2}
      />
    </Icosahedron>
  )
}

export default function Background3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 6], fov: 55 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <FloatingOrb position={[-3, 1, -2]} color="#a855f7" />
        <FloatingOrb position={[3, -1, -2]} color="#ec4899" />
        <FloatingOrb position={[0, 2, -3]} color="#3b82f6" />
      </Canvas>
    </div>
  )
}

