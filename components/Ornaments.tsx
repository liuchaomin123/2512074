import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../types';

interface OrnamentGroupProps {
  isFormed: boolean;
}

// Generate data with physics properties
const usePhysicsOrnaments = (count: number, type: 'inner' | 'outer' | 'scatter') => {
  return useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      // Chaos Position (Exploded state)
      const r = Math.cbrt(Math.random()) * 18 + 5; // Wide scatter
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const cx = r * Math.sin(phi) * Math.cos(theta);
      const cy = r * Math.sin(phi) * Math.sin(theta); 
      const cz = r * Math.cos(phi);

      // Target Position (Tree state)
      const h = CONFIG.treeHeight;
      const y = Math.random() * h * 0.9;
      let levelRadius = (1 - y / h) * CONFIG.treeRadius;
      
      if (type === 'inner') levelRadius *= 0.5 + Math.random() * 0.3;
      if (type === 'outer') levelRadius *= 0.9 + Math.random() * 0.2;

      const angle = Math.random() * Math.PI * 2;
      const tx = levelRadius * Math.cos(angle);
      const ty = y;
      const tz = levelRadius * Math.sin(angle);

      // Random Rotation
      const rot = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      data.push({
        chaosPos: new THREE.Vector3(cx, cy, cz),
        targetPos: new THREE.Vector3(tx, ty, tz),
        currentPos: new THREE.Vector3(tx, ty, tz),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: rot,
        rotVelocity: new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2),
        mass: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    return data;
  }, [count, type]);
};

const Ornaments: React.FC<OrnamentGroupProps> = ({ isFormed }) => {
  // 1. Spheres (Reduced Size)
  const ballCount = 120;
  const balls = usePhysicsOrnaments(ballCount, 'outer');
  const ballMesh = useRef<THREE.InstancedMesh>(null);

  // 2. Gift Boxes
  const boxCount = 40;
  const boxes = usePhysicsOrnaments(boxCount, 'scatter');
  const boxMesh = useRef<THREE.InstancedMesh>(null);

  // 3. Diamonds
  const diamondCount = 50;
  const diamonds = usePhysicsOrnaments(diamondCount, 'outer');
  const diamondMesh = useRef<THREE.InstancedMesh>(null);

  // 4. Rings (New)
  const ringCount = 60;
  const rings = usePhysicsOrnaments(ringCount, 'outer');
  const ringMesh = useRef<THREE.InstancedMesh>(null);

  // 5. Icicles (New)
  const icicleCount = 60;
  const icicles = usePhysicsOrnaments(icicleCount, 'inner');
  const icicleMesh = useRef<THREE.InstancedMesh>(null);

  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1); 
    const time = state.clock.elapsedTime;

    // Physics Update Function
    const updatePhysics = (
      items: any[], 
      mesh: THREE.InstancedMesh, 
      scaleBase: number,
      stiffness: number,
      damping: number,
      noiseStrength: number,
      orientToUp: boolean = false
    ) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        const dest = isFormed ? item.targetPos : item.chaosPos;
        
        // Spring Force
        tempVec.copy(dest).sub(item.currentPos).multiplyScalar(stiffness / item.mass);
        item.velocity.add(tempVec);

        // Chaos Noise
        if (!isFormed) {
          const noiseX = Math.sin(time * 0.5 + item.phase) * noiseStrength;
          const noiseY = Math.cos(time * 0.3 + item.phase * 2) * noiseStrength;
          const noiseZ = Math.sin(time * 0.7 + item.phase * 0.5) * noiseStrength;
          item.velocity.add(new THREE.Vector3(noiseX, noiseY, noiseZ));
        }

        // Damping
        item.velocity.multiplyScalar(damping);

        // Update Position
        item.currentPos.add(item.velocity.clone().multiplyScalar(dt * 60));

        // Update Rotation
        if (!isFormed) {
            item.rotation.x += item.rotVelocity.x;
            item.rotation.y += item.rotVelocity.y;
            item.rotation.z += item.rotVelocity.z;
        } else {
            item.rotation.y += 0.01;
            // Dampen other rotations back to 0 if needed, or just let them spin on Y
        }

        tempObj.position.copy(item.currentPos);
        
        if (orientToUp && isFormed) {
             // For Icicles, point down
             tempObj.rotation.set(Math.PI, 0, 0); // Point down
        } else {
             tempObj.rotation.copy(item.rotation);
        }
        
        const s = scaleBase + Math.sin(time + i) * 0.05;
        tempObj.scale.setScalar(s);

        tempObj.updateMatrix();
        mesh.setMatrixAt(i, tempObj.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };

    if (ballMesh.current) updatePhysics(balls, ballMesh.current, 1.0, 0.05, 0.92, 0.02);
    if (boxMesh.current) updatePhysics(boxes, boxMesh.current, 0.6, 0.04, 0.90, 0.03);
    if (diamondMesh.current) updatePhysics(diamonds, diamondMesh.current, 0.5, 0.06, 0.94, 0.04);
    if (ringMesh.current) updatePhysics(rings, ringMesh.current, 0.4, 0.05, 0.93, 0.02);
    if (icicleMesh.current) updatePhysics(icicles, icicleMesh.current, 0.5, 0.05, 0.93, 0.02, true);
    
    // Initial Colors (run once check)
    if (ballMesh.current && !ballMesh.current.userData.colored) {
        for(let i=0; i<ballCount; i++) {
             const c = i % 3 === 0 ? CONFIG.colors.red : (i % 3 === 1 ? CONFIG.colors.gold : '#B8860B');
             ballMesh.current.setColorAt(i, new THREE.Color(c));
        }
        ballMesh.current.instanceColor!.needsUpdate = true;
        ballMesh.current.userData.colored = true;
    }
    
    if (boxMesh.current && !boxMesh.current.userData.colored) {
        for(let i=0; i<boxCount; i++) {
             const c = i % 2 === 0 ? '#003311' : CONFIG.colors.gold;
             boxMesh.current.setColorAt(i, new THREE.Color(c));
        }
        boxMesh.current.instanceColor!.needsUpdate = true;
        boxMesh.current.userData.colored = true;
    }
    
    if (diamondMesh.current && !diamondMesh.current.userData.colored) {
        for(let i=0; i<diamondCount; i++) {
             diamondMesh.current.setColorAt(i, new THREE.Color('#E0FFFF'));
        }
        diamondMesh.current.instanceColor!.needsUpdate = true;
        diamondMesh.current.userData.colored = true;
    }

    if (ringMesh.current && !ringMesh.current.userData.colored) {
        for(let i=0; i<ringCount; i++) {
             ringMesh.current.setColorAt(i, new THREE.Color(CONFIG.colors.gold));
        }
        ringMesh.current.instanceColor!.needsUpdate = true;
        ringMesh.current.userData.colored = true;
    }

    if (icicleMesh.current && !icicleMesh.current.userData.colored) {
        for(let i=0; i<icicleCount; i++) {
             icicleMesh.current.setColorAt(i, new THREE.Color('#FFFFFF'));
        }
        icicleMesh.current.instanceColor!.needsUpdate = true;
        icicleMesh.current.userData.colored = true;
    }

  });

  return (
    <group>
      {/* 1. Balls - Reduced Size (0.5 radius) */}
      <instancedMesh ref={ballMesh} args={[undefined, undefined, ballCount]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial 
            metalness={0.7} 
            roughness={0.1} 
            clearcoat={1.0}
            envMapIntensity={2.0} 
        />
      </instancedMesh>

      {/* 2. Boxes */}
      <instancedMesh ref={boxMesh} args={[undefined, undefined, boxCount]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
            metalness={0.4} 
            roughness={0.4} 
            envMapIntensity={1}
        />
      </instancedMesh>

      {/* 3. Diamonds */}
      <instancedMesh ref={diamondMesh} args={[undefined, undefined, diamondCount]} castShadow>
         <octahedronGeometry args={[1, 0]} />
         <meshPhysicalMaterial 
            color="#ffffff"
            metalness={0.1}
            roughness={0}
            transmission={0.9}
            thickness={2.0}
            ior={1.5}
            envMapIntensity={2}
         />
      </instancedMesh>

      {/* 4. Rings (Torus) - NEW */}
      <instancedMesh ref={ringMesh} args={[undefined, undefined, ringCount]} castShadow>
         <torusGeometry args={[0.6, 0.1, 16, 32]} />
         <meshStandardMaterial 
            metalness={1.0}
            roughness={0.15}
            color={CONFIG.colors.gold}
         />
      </instancedMesh>

      {/* 5. Icicles (Cone) - NEW */}
      <instancedMesh ref={icicleMesh} args={[undefined, undefined, icicleCount]} castShadow>
         <coneGeometry args={[0.15, 1.5, 8]} />
         <meshPhysicalMaterial 
            color="#E0FFFF"
            metalness={0.2}
            roughness={0.05}
            transmission={0.8}
            opacity={0.9}
            transparent
            ior={1.3}
         />
      </instancedMesh>
    </group>
  );
};

export default Ornaments;