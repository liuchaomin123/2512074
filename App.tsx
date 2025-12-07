import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { TreeState } from './types';
import Experience from './components/Experience';
import Overlay from './components/Overlay';

// Curated default photos using reliable Picsum seeds to prevent loading errors
const DEFAULT_PHOTOS = [
  "https://picsum.photos/seed/luxury1/800/800", 
  "https://picsum.photos/seed/xmas2/800/800",
  "https://picsum.photos/seed/winter3/800/800",
  "https://picsum.photos/seed/gold4/800/800",
  "https://picsum.photos/seed/snow5/800/800",
  "https://picsum.photos/seed/star6/800/800" 
];

// Top level error boundary for the canvas
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-gold p-8 text-center z-50">
            <div>
              <p className="text-[#FFD700] font-serif text-2xl mb-4">The Magic Paused</p>
              <p className="text-[#FFF8C6] opacity-80">Please refresh the page to restore the experience.</p>
            </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  // Start in FORMED state (Tree is assembled, ready to explode)
  const [treeState, setTreeState] = useState<TreeState>(TreeState.FORMED);
  const [snowEnabled, setSnowEnabled] = useState(true);
  
  // Initialize with DEFAULT_PHOTOS so it's never empty
  const [userPhotos, setUserPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [photoOffset, setPhotoOffset] = useState(0); // For slideshow cycling
  const [isProcessing, setIsProcessing] = useState(false);

  const toggleState = () => {
    setTreeState((prev) => (prev === TreeState.CHAOS ? TreeState.FORMED : TreeState.CHAOS));
  };

  const toggleSnow = () => {
    setSnowEnabled((prev) => !prev);
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsProcessing(true);
      
      // Cleanup old object URLs to avoid memory leaks (only if they are blob URLs)
      userPhotos.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      
      const newPhotos: string[] = [];
      const fileArray = Array.from(files);

      // Directly create ObjectURLs
      fileArray.forEach((file: File) => {
        if (file.type && file.type.startsWith('image/')) {
           newPhotos.push(URL.createObjectURL(file));
        }
      });
      
      if (newPhotos.length > 0) {
        setUserPhotos(newPhotos);
        setPhotoOffset(0); // Reset slideshow
      }
      
      setIsProcessing(false);
    }
  };

  const handleNextPhoto = () => {
    if (userPhotos.length === 0) return;
    setPhotoOffset(prev => (prev + 1) % userPhotos.length);
  };

  const handlePrevPhoto = () => {
    if (userPhotos.length === 0) return;
    setPhotoOffset(prev => (prev - 1 + userPhotos.length) % userPhotos.length);
  };

  return (
    <>
      <div className="w-full h-full relative bg-gradient-to-b from-[#001005] to-[#002010]">
        <AppErrorBoundary>
          <Canvas
            shadows
            dpr={[1, 2]} // Limit DPR to 2 for performance
            camera={{ position: [0, 4, 20], fov: 45 }}
            gl={{ antialias: false, stencil: false, alpha: false }}
          >
            <Suspense fallback={null}>
              <Experience 
                treeState={treeState} 
                snowEnabled={snowEnabled}
                userPhotos={userPhotos}
                photoOffset={photoOffset}
              />
            </Suspense>
          </Canvas>
        </AppErrorBoundary>
        
        <Overlay 
          treeState={treeState} 
          onToggle={toggleState} 
          snowEnabled={snowEnabled}
          onToggleSnow={toggleSnow}
          onUploadPhotos={handlePhotoUpload}
          hasPhotos={userPhotos.length > 0}
          onNextPhoto={handleNextPhoto}
          onPrevPhoto={handlePrevPhoto}
          isProcessing={isProcessing}
        />
        
        <Loader 
          containerStyles={{ background: '#001005' }}
          innerStyles={{ border: '1px solid #FFD700', width: '200px' }}
          barStyles={{ background: '#FFD700' }}
          dataStyles={{ fontFamily: 'Cinzel', color: '#FFD700' }}
        />
      </div>
    </>
  );
};

export default App;