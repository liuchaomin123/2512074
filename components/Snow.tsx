import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Snow: React.FC = () => {
  const count = 1500;
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const wiggles = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;     // x
      positions[i * 3 + 1] = Math.random() * 40;         // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // z
      
      speeds[i] = 0.05 + Math.random() * 0.1; // Falling speed
      wiggles[i] = Math.random() * Math.PI * 2; // Initial wiggle phase
    }
    
    return { positions, speeds, wiggles };
  }, []);

  useFrame((state) => {
    if (!mesh.current) return;

    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      // Move down
      positions[i * 3 + 1] -= particles.speeds[i];

      // Add wiggle
      positions[i * 3] += Math.sin(state.clock.elapsedTime + particles.wiggles[i]) * 0.02;

      // Reset if below ground
      if (positions[i * 3 + 1] < -5) {
        positions[i * 3 + 1] = 30; // Respawn at top
        positions[i * 3] = (Math.random() - 0.5) * 50; // New random X
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // New random Z
      }
    }
    
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#FFFDD0"
        transparent
        opacity={0.8}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

export default Snow;