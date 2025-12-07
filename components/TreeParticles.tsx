import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../types';

// Define the ShaderMaterial
class FoliageMaterial extends THREE.ShaderMaterial {
  // Explicitly declare uniforms property to satisfy TypeScript
  declare uniforms: { [uniform: string]: THREE.IUniform };

  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor1: { value: new THREE.Color(CONFIG.colors.emerald) },
        uColor2: { value: new THREE.Color(CONFIG.colors.gold) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uProgress;
        attribute vec3 aTargetPos;
        attribute float aScale;
        attribute float aRandom;
        
        varying vec3 vColor;
        varying float vAlpha;

        // Cubic easing out
        float easeOutCubic(float x) {
          return 1.0 - pow(1.0 - x, 3.0);
        }

        void main() {
          // Chaos position (using position attribute as initial chaos)
          vec3 chaosPos = position;
          
          // Interpolate
          float t = easeOutCubic(uProgress);
          vec3 finalPos = mix(chaosPos, aTargetPos, t);
          
          // Add some wind/sparkle movement
          float wind = sin(uTime * 2.0 + finalPos.y * 0.5 + aRandom * 10.0) * 0.05;
          finalPos.x += wind;
          finalPos.z += wind;

          vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
          
          // Size attenuation
          gl_PointSize = aScale * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;

          // Glitter effect based on view angle
          float sparkle = sin(uTime * 3.0 + aRandom * 100.0);
          
          // Mix emerald and gold randomly
          float colorMix = step(0.85, aRandom); // Top 15% are gold tips
          vColor = mix(vec3(0.0, 0.3, 0.1), vec3(1.0, 0.84, 0.0), colorMix);
          
          // Boost brightness for bloom
          if (sparkle > 0.9 && t > 0.5) {
             vColor += vec3(0.5); 
          }
          
          vAlpha = 1.0;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;

          // Soft edge
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);

          gl_FragColor = vec4(vColor, alpha * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  set uProgress(value: number) {
    this.uniforms.uProgress.value = value;
  }
  
  get uProgress() {
    return this.uniforms.uProgress.value;
  }

  set uTime(value: number) {
    this.uniforms.uTime.value = value;
  }
}

interface TreeParticlesProps {
  isFormed: boolean;
}

const TreeParticles: React.FC<TreeParticlesProps> = ({ isFormed }) => {
  const materialRef = useRef<FoliageMaterial>(null);
  const count = CONFIG.particleCount;

  // Create material instance once to use with <primitive>
  const foliageMaterial = useMemo(() => new FoliageMaterial(), []);

  // Generate Geometry Data once
  const { positions, targets, scales, randoms } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // 1. Chaos Position: Random Sphere
      const r = Math.cbrt(Math.random()) * 15; // uniform distribution in sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const cx = r * Math.sin(phi) * Math.cos(theta);
      const cy = r * Math.sin(phi) * Math.sin(theta) + 7; // Center sphere higher up
      const cz = r * Math.cos(phi);
      
      positions.set([cx, cy, cz], i * 3);

      // 2. Target Position: Cone / Tree
      // Spiral distribution
      const h = CONFIG.treeHeight;
      const y = Math.random() * h;
      const levelRadius = (1 - y / h) * CONFIG.treeRadius;
      // Golden angle for nice distribution
      const spiralAngle = i * 2.39996; 
      
      const tx = levelRadius * Math.cos(spiralAngle);
      const ty = y; // from 0 to height
      const tz = levelRadius * Math.sin(spiralAngle);

      targets.set([tx, ty, tz], i * 3);

      // Attributes
      scales[i] = Math.random() * 0.5 + 0.5; // Scale variation
      randoms[i] = Math.random();
    }

    return { positions, targets, scales, randoms };
  }, [count]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      
      // Smooth lerp for uProgress
      const targetProgress = isFormed ? 1 : 0;
      materialRef.current.uProgress = THREE.MathUtils.lerp(
        materialRef.current.uProgress,
        targetProgress,
        delta * 1.5 // Speed of transition
      );
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={targets.length / 3}
          array={targets}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
         <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={foliageMaterial} attach="material" ref={materialRef} />
    </points>
  );
};

export default TreeParticles;