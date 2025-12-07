import React, { useRef } from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  onToggle: () => void;
  snowEnabled: boolean;
  onToggleSnow: () => void;
  onUploadPhotos: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasPhotos: boolean;
  onNextPhoto: () => void;
  onPrevPhoto: () => void;
  isProcessing: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ 
  treeState, 
  onToggle, 
  onUploadPhotos,
  onNextPhoto,
  onPrevPhoto,
  isProcessing
}) => {
  const isFormed = treeState === TreeState.FORMED;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center pb-12 z-10">
      
      {/* Gallery Navigation - Minimal Icons */}
      <div className="flex items-center gap-12 mb-8 pointer-events-auto">
          <button 
              onClick={onPrevPhoto}
              className="p-3 rounded-full border border-luxury-gold/30 bg-black/20 text-luxury-gold hover:bg-luxury-gold hover:text-luxury-green transition-all backdrop-blur-sm"
              aria-label="Previous Photo"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <button 
              onClick={onNextPhoto}
              className="p-3 rounded-full border border-luxury-gold/30 bg-black/20 text-luxury-gold hover:bg-luxury-gold hover:text-luxury-green transition-all backdrop-blur-sm"
              aria-label="Next Photo"
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
      </div>

      {/* Main Actions Row */}
      <div className="flex gap-6 pointer-events-auto items-center items-end">
        
        {/* Toggle State Button (Primary - Larger) */}
        <button
          onClick={onToggle}
          className={`
            px-6 py-2 bg-luxury-gold/10 
            border border-luxury-gold text-luxury-gold
            hover:bg-luxury-gold hover:text-luxury-green
            font-display font-bold tracking-widest uppercase text-sm
            transition-all duration-300 backdrop-blur-md
            rounded-sm shadow-[0_0_10px_rgba(255,215,0,0.15)]
          `}
        >
            {isFormed ? 'Unleash Chaos' : 'Assemble Tree'}
        </button>

        {/* Upload Button (Secondary - Smaller) */}
        <button
            onClick={triggerUpload}
            disabled={isProcessing}
            className={`
                px-4 py-1.5 bg-luxury-gold/5
                border border-luxury-gold/50 text-luxury-gold/80
                hover:bg-luxury-gold hover:text-luxury-green hover:border-luxury-gold hover:opacity-100
                font-display font-bold tracking-wider uppercase text-xs
                transition-all duration-300 backdrop-blur-md
                rounded-sm
                ${isProcessing ? 'opacity-50 cursor-wait' : ''}
            `}
        >
            {isProcessing ? 'Processing...' : 'Change Photos'}
        </button>

        <input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            onChange={onUploadPhotos}
        />
      </div>
    </div>
  );
};

export default Overlay;