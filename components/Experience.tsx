import React, { Suspense } from 'react';
import { Environment, OrbitControls, ContactShadows, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { TreeState } from '../types';
import TreeParticles from './TreeParticles';
import Ornaments from './Ornaments';
import Photos from './Photos';
import Snow from './Snow';
import LuckyStar from './LuckyStar';

interface ExperienceProps {
  treeState: TreeState;
  snowEnabled: boolean;
  userPhotos: string[];
  photoOffset?: number;
}

const Experience: React.FC<ExperienceProps> = ({ treeState, snowEnabled, userPhotos, photoOffset = 0 }) => {
  const isFormed = treeState === TreeState.FORMED;

  return (
    <>
      {/* Lighting & Environment */}
      <Environment preset="lobby" background={false} />
      
      {/* Starry Background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.5} color="#002010" />
      <spotLight
        position={[10, 20, 10]}
        angle={0.3}
        penumbra={1}
        intensity={200}
        castShadow
        color="#FFD700"
      />
      <pointLight position={[-10, 5, -10]} intensity={50} color="#00ff88" />

      {/* Snow Effect */}
      {snowEnabled && <Snow />}

      {/* Main Content */}
      <group position={[0, -5, 0]}>
        <TreeParticles isFormed={isFormed} />
        <Ornaments isFormed={isFormed} />
        
        {/* CRITICAL FIX: Wrap Photos in Suspense so textures/fonts don't block the Tree */}
        <Suspense fallback={null}>
            {/* Pass userPhotos and offset. Photos component handles empty check internally. */}
            <Photos isFormed={isFormed} count={12} userPhotos={userPhotos} photoOffset={photoOffset} />
        </Suspense>

        <LuckyStar isFormed={isFormed} />
        
        <ContactShadows 
            opacity={0.7} 
            scale={20} 
            blur={2} 
            far={4} 
            resolution={256} 
            color="#000000" 
        />
      </group>

      {/* Camera Controls */}
      <OrbitControls 
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={35}
        autoRotate={isFormed}
        autoRotateSpeed={0.5}
      />

      {/* Post Processing */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.8} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </>
  );
};

export default Experience;