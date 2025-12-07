import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../types';

interface LuckyStarProps {
  isFormed: boolean;
}

const LuckyStar: React.FC<LuckyStarProps> = ({ isFormed }) => {
  const meshRef = useRef<THREE.Group>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  // Generate a 5-pointed star shape
  const starGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 5;
    const outerRadius = 1.5;
    const innerRadius = 0.6; // Fat star
    
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2;
      // Rotate -Math.PI/2 to make it point upwards initially if needed, 
      // but geometry rotation is easier.
      const x = Math.cos(angle + Math.PI / 2) * r; 
      const y = Math.sin(angle + Math.PI / 2) * r;
      
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 0.4,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Center the geometry
  useMemo(() => {
    starGeometry.center();
  }, [starGeometry]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Target Position: Top of tree (FORMED) vs Center of universe (CHAOS)
    // Tree height is 14.
    // CHANGED: Chaos position moved to y=5 (was y=0) so it floats higher
    const targetPos = isFormed 
      ? new THREE.Vector3(0, CONFIG.treeHeight + 0.5, 0) 
      : new THREE.Vector3(0, 5, 0); 

    // Smoothly interpolate position
    meshRef.current.position.lerp(targetPos, delta * 2.0);

    // Rotation Logic
    if (isFormed) {
        // Gentle idle rotation
        meshRef.current.rotation.y += delta * 0.5;
        // Bobbing motion
        meshRef.current.position.y += Math.sin(time * 2) * 0.005;
    } else {
        // Chaotic rotation (SLOWED DOWN significantly)
        // Was 4.0, 5.0, 3.0
        meshRef.current.rotation.x += delta * 0.5;
        meshRef.current.rotation.y += delta * 0.8;
        meshRef.current.rotation.z += delta * 0.4;
    }

    // Pulse Effect (Scale)
    const pulse = isFormed 
        ? 1.0 + Math.sin(time * 3) * 0.05
        : 1.5 + Math.sin(time * 10) * 0.2; // Bigger and faster pulse in Chaos
    
    meshRef.current.scale.setScalar(pulse);

    // Light Intensity Pulse
    if (pointLightRef.current) {
        pointLightRef.current.intensity = isFormed ? 60 + Math.sin(time * 4) * 20 : 300;
        pointLightRef.current.distance = isFormed ? 20 : 60;
    }
  });

  return (
    <group ref={meshRef}>
      {/* The Core Star */}
      <mesh geometry={starGeometry} castShadow>
        <meshPhysicalMaterial 
            color="#FFD700"
            emissive="#FFAA00"
            emissiveIntensity={1.5}
            metalness={1}
            roughness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* Inner light source */}
      <pointLight 
        ref={pointLightRef} 
        color="#FFD700" 
        decay={2}
      />
    </group>
  );
};

export default LuckyStar;