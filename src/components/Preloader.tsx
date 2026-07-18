import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PreloaderProps {
  imageUrls: string[];
  onComplete: (loadedImages: HTMLImageElement[]) => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ imageUrls, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing Cosmic Void...');

  useEffect(() => {
    // Prevent scroll while loading
    document.body.style.overflow = 'hidden';

    const textSequences = [
      { threshold: 0, text: 'Initializing Cosmic Void...' },
      { threshold: 20, text: 'Calibrating Volumetric Lights...' },
      { threshold: 40, text: 'Synthesizing Cosmic Particles...' },
      { threshold: 65, text: 'Crystallizing Iridescent Fragments...' },
      { threshold: 85, text: 'Aligning Quantum Facets...' },
      { threshold: 98, text: 'Assembling Logo Structure...' },
    ];

    let loadedCount = 0;
    const total = imageUrls.length;

    if (total === 0) {
      onComplete([]);
      return;
    }

    const loadImages = async () => {
      try {
        const loadedImages = await Promise.all(
          imageUrls.map(async (url) => {
            const img = new Image();
            img.src = url;

            // Load and decode
            await new Promise<void>((resolve) => {
              img.onload = async () => {
                try {
                  if ('decode' in img) {
                    await img.decode();
                  }
                } catch (e) {
                  console.warn('Image decode failed for URL:', url, e);
                }
                resolve();
              };
              img.onerror = () => {
                console.error('Failed to load image:', url);
                resolve();
              };
            });

            loadedCount++;
            const percent = Math.min(Math.round((loadedCount / total) * 100), 100);
            setProgress(percent);

            // Update text based on progress
            const textMatch = [...textSequences]
              .reverse()
              .find((seq) => percent >= seq.threshold);
            if (textMatch) {
              setLoadingText(textMatch.text);
            }

            return img;
          })
        );

        // Allow some time for visual completion state
        setTimeout(() => {
          document.body.style.overflow = '';
          onComplete(loadedImages);
        }, 800);
      } catch (err) {
        console.error('Error preloading images:', err);
        document.body.style.overflow = '';
        onComplete([]);
      }
    };

    loadImages();

    return () => {
      document.body.style.overflow = '';
    };
  }, [imageUrls, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black font-sans select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-ambient-glow opacity-60" />

      {/* Center Container */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        {/* Logo Icon Placeholder/Spinner */}
        <div className="relative mb-8 w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-violet-500/20" />
          <motion.div
            className="absolute inset-0 rounded-full border-t border-r border-violet-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
          <div className="w-8 h-8 rounded-full bg-violet-950/40 backdrop-blur-sm border border-violet-500/30 flex items-center justify-center">
            <span className="text-[10px] font-bold text-violet-400">C</span>
          </div>
        </div>

        {/* Loading Message */}
        <motion.div
          key={loadingText}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="text-xs uppercase tracking-[0.25em] text-violet-300/80 mb-4 h-6 font-display font-medium"
        >
          {loadingText}
        </motion.div>

        {/* Progress Bar Container */}
        <div className="relative w-64 h-[2px] bg-white/5 rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute h-full left-0 top-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.1 }}
          />
        </div>

        {/* Percentage Indicator */}
        <div className="font-mono text-[10px] tracking-widest text-white/40 uppercase">
          Loading <span className="text-white font-medium text-xs ml-1">{progress}%</span>
        </div>
      </div>

      {/* Decorative Corner Borders */}
      <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-white/10" />
      <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-white/10" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-white/10" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-white/10" />
    </div>
  );
};
