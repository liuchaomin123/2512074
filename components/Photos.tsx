import React, { useMemo, useRef, useState, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import { CONFIG, DualPosition } from '../types';

interface PhotosProps {
  isFormed: boolean;
  count: number;
  userPhotos: string[];
  photoOffset: number;
}

interface PhotoItemProps {
  data: DualPosition;
  isFormed: boolean;
  index: number;
  url: string;
  isFeatured: boolean;
}

// 1. Error Boundary to catch Texture Loading failures
interface TextureErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface TextureErrorBoundaryState {
  hasError: boolean;
}

class TextureErrorBoundary extends React.Component<TextureErrorBoundaryProps, TextureErrorBoundaryState> {
  constructor(props: TextureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// 2. Isolated Component that actually triggers useTexture
const PhotoPlaneContent: React.FC<{ url: string }> = ({ url }) => {
  // useTexture throws a Promise (Suspense) or an Error (Boundary)
  const texture = useTexture(url);

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
  );
};

// 3. Fallback visual for failed images
const FallbackMaterial = () => <meshBasicMaterial color="#333333" toneMapped={false} />;

const PhotoItem: React.FC<PhotoItemProps> = ({ data, isFormed, index, url, isFeatured }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Reusable objects for calculations to reduce GC
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth Speed Factor
    // 2.0 = fast, 0.5 = slow. 
    // We want a very elegant slide.
    const lerpSpeed = isFeatured ? 2.0 : 1.5; 
    
    // --- TARGET CALCULATION ---
    let targetScale = 1;

    if (isFormed) {
        // --- TREE STATE ---
        targetPos.set(data.target[0], data.target[1], data.target[2]);
        
        // Convert Euler target to Quaternion
        const euler = new THREE.Euler(data.rotationTarget[0], data.rotationTarget[1], data.rotationTarget[2]);
        targetQuat.setFromEuler(euler);
        
        targetScale = 1.2;
    } else {
        // --- CHAOS STATE ---
        if (isFeatured) {
            // FEATURED: Fly to front of camera (HUD-like feel)
            
            // 1. Get Forward Vector of Camera (Direction camera is looking)
            forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
            
            // 2. Set World Position: Camera Pos + Forward * Distance
            targetPos.copy(camera.position).add(forward.multiplyScalar(5));

            // 3. COMPENSATION: Parent Group is at [0, -5, 0].
            // To be at 'targetPos' in World Space, we must be at 'targetPos + 5' in Local Y Space.
            targetPos.y += 5;
            
            // 4. Set Rotation: Align exactly with camera (Screen Space alignment)
            targetQuat.copy(camera.quaternion);
            
            targetScale = 1.5; 
        } else {
            // BACKGROUND: Scatter
            targetPos.set(data.chaos[0], data.chaos[1], data.chaos[2]);
            
            // For background chaos, we can have a slow continuous tumble or just a fixed random rotation.
            // Let's do a fixed random rotation to keep it clean, or update quaternion slowly.
            // Using the pre-calculated random rotation for chaos state:
             const euler = new THREE.Euler(
                data.rotationChaos[0] + state.clock.elapsedTime * 0.05, 
                data.rotationChaos[1] + state.clock.elapsedTime * 0.05, 
                data.rotationChaos[2]
            );
            targetQuat.setFromEuler(euler);
            
            targetScale = 0.8; 
        }
    }

    // --- SMOOTH INTERPOLATION (No Physics/Springs) ---
    meshRef.current.position.lerp(targetPos, delta * lerpSpeed);
    meshRef.current.quaternion.slerp(targetQuat, delta * lerpSpeed);
    
    // Scale Lerp
    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * lerpSpeed);
    meshRef.current.scale.setScalar(nextScale);
  });

  return (
    <group ref={meshRef} scale={1.2}>
      {/* Gold Border / Trim */}
      <mesh position={[0, 0, -0.02]} castShadow>
        <boxGeometry args={[1.25, 1.55, 0.04]} />
        <meshPhysicalMaterial 
            color="#FFD700" 
            emissive="#B8860B"
            emissiveIntensity={0.5}
            metalness={1.0} 
            roughness={0.15}
            clearcoat={1.0}
        />
      </mesh>

      {/* White Polaroid Frame */}
      <mesh position={[0, 0, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.5, 0.05]} />
        <meshStandardMaterial color="#F8F8FF" roughness={0.6} metalness={0.1} />
      </mesh>
      
      {/* Photo Plane */}
      <mesh position={[0, 0.15, 0.02]}>
        <planeGeometry args={[1, 1]} />
        {/* Isolate the material loading so if it fails, the mesh still exists with fallback */}
        <TextureErrorBoundary fallback={<FallbackMaterial />}>
           <Suspense fallback={<FallbackMaterial />}>
             <PhotoPlaneContent url={url} />
           </Suspense>
        </TextureErrorBoundary>
      </mesh>

      {/* Caption Text */}
      <Suspense fallback={null}>
        <Text
          position={[0, -0.55, 0.03]}
          fontSize={0.1}
          color="#004020"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.05}
          // Removing custom font URL to ensure stability
        >
          MERRY CHRISTMAS
        </Text>
      </Suspense>
    </group>
  );
};

const Photos: React.FC<PhotosProps> = ({ isFormed, count, userPhotos, photoOffset }) => {
  // Safe check
  if (!userPhotos || userPhotos.length === 0) return null;

  const totalCount = 12;
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  useEffect(() => {
    if (!isFormed) {
      // Pick a random photo to feature when Chaos is unleashed
      setFeaturedIndex(Math.floor(Math.random() * totalCount));
    }
  }, [isFormed]);

  const photoData = useMemo(() => {
    const data: DualPosition[] = [];
    for (let i = 0; i < totalCount; i++) {
        // --- TARGET (Tree) ---
        const h = CONFIG.treeHeight;
        const y = Math.random() * h * 0.7 + 2; 
        const levelRadius = ((1 - y / h) * CONFIG.treeRadius) + 0.6;
        const angle = (i / totalCount) * Math.PI * 2 + (Math.random() * 0.5);
        
        const tx = levelRadius * Math.cos(angle);
        const ty = y;
        const tz = levelRadius * Math.sin(angle);
        
        const rotTargetX = 0;
        const rotTargetY = -angle + Math.PI / 2;
        const rotTargetZ = (Math.random() - 0.5) * 0.5;

        // --- CHAOS (Background Scatter) ---
        // Push them further back so they don't clip with the featured one
        const cx = (Math.random() - 0.5) * 35; 
        const cy = Math.random() * 15 - 5; 
        const cz = (Math.random() - 0.5) * 35; 

        const rotChaosX = (Math.random() - 0.5) * 1;
        const rotChaosY = (Math.random() - 0.5) * 1;
        const rotChaosZ = (Math.random() - 0.5) * 1;

        data.push({
            chaos: [cx, cy, cz],
            target: [tx, ty, tz],
            rotationChaos: [rotChaosX, rotChaosY, rotChaosZ],
            rotationTarget: [rotTargetX, rotTargetY, rotTargetZ]
        });
    }
    return data;
  }, [totalCount]);

  const getUrl = (index: number) => {
    if (userPhotos.length === 0) return "";
    return userPhotos[(index + photoOffset) % userPhotos.length];
  };

  return (
    <group>
        {photoData.map((data, i) => (
            <PhotoItem 
              key={i} 
              index={i} 
              data={data} 
              isFormed={isFormed} 
              url={getUrl(i)}
              isFeatured={i === featuredIndex}
            />
        ))}
    </group>
  );
};

export default Photos;