import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroVideoProps {
  onVideoEnded: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({ onVideoEnded }) => {
  const [videoReady, setVideoReady] = useState(false);
  const [loadingText, setLoadingText] = useState('Initializing CASYUM 2K26...');
  const [particles, setParticles] = useState<Particle[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playInitiated = useRef(false);

  useEffect(() => {
    const generated: Particle[] = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 2,
    }));
    setParticles(generated);
  }, []);

  useEffect(() => {
    if (videoReady) return;
    const phrases = [
      'Initializing CASYUM 2K26...',
      'Connecting to Neural Grid...',
      'Syncing Volumetric Buffers...',
      'Calibrating Quantum Crystals...',
      'Ready for Hyper-Jump...',
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phrases.length;
      setLoadingText(phrases[currentIndex]);
    }, 1200);

    return () => clearInterval(interval);
  }, [videoReady]);

  const preloadHomepageAssets = () => {
    if (playInitiated.current) return;
    playInitiated.current = true;

    const img = new Image();
    img.src = '/images/final.jpeg';

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';
    link.as = 'fetch';
    document.head.appendChild(link);
  };

  const handleCanPlayThrough = () => {
    if (videoReady) return;
    setVideoReady(true);
    preloadHomepageAssets();
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn('Auto-play failed, user interaction may be required:', err);
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!videoReady) {
        console.log('Safety preloader timeout triggered.');
        handleCanPlayThrough();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [videoReady]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-ambient-glow opacity-80 z-0 pointer-events-none" />

      <AnimatePresence>
        {!videoReady && (
          <motion.div
            key="preloader-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md text-white select-none pointer-events-none"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full bg-violet-400/60"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    boxShadow: '0 0 8px rgba(167, 139, 250, 0.4)',
                  }}
                  animate={{
                    y: [0, -120],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: p.duration,
                    repeat: Infinity,
                    delay: p.delay,
                    ease: 'linear',
                  }}
                />
              ))}
            </div>

            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-full border border-violet-500/20"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute w-24 h-24 rounded-full border border-t-2 border-cyan-500/30 border-t-cyan-400"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute w-20 h-20 rounded-full border border-r-2 border-violet-500/30 border-r-violet-400"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />

              <motion.svg
                viewBox="0 0 100 100"
                className="w-14 h-14 drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]"
                animate={{
                  y: [0, -4, 0],
                  scale: [1, 1.03, 1],
                  filter: [
                    'drop-shadow(0 0 10px rgba(139,92,246,0.5))',
                    'drop-shadow(0 0 20px rgba(6,182,212,0.8))',
                    'drop-shadow(0 0 10px rgba(139,92,246,0.5))',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <defs>
                  <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <polygon points="50,15 72,50 50,85 28,50" fill="url(#crystalGrad)" opacity="0.85" />
                <polygon points="50,15 50,85 72,50" fill="#ffffff" opacity="0.15" />
                <polygon points="50,15 28,50 50,50" fill="#000000" opacity="0.2" />
                <polygon points="50,50 72,50 50,85" fill="#ffffff" opacity="0.1" />
                <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                <line x1="28" y1="50" x2="72" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
              </motion.svg>
            </div>

            <motion.div
              key={loadingText}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-xs uppercase tracking-[0.3em] text-violet-300 font-display font-bold text-center drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]"
            >
              {loadingText}
            </motion.div>

            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-white/10 overflow-hidden">
              <motion.div
                className="w-16 h-full bg-gradient-to-r from-transparent via-violet-400 to-transparent"
                animate={{ x: [-80, 240] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="absolute top-12 left-12 w-6 h-6 border-t-2 border-l-2 border-violet-500/30" />
            <div className="absolute top-12 right-12 w-6 h-6 border-t-2 border-r-2 border-violet-500/30" />
            <div className="absolute bottom-12 left-12 w-6 h-6 border-b-2 border-l-2 border-violet-500/30" />
            <div className="absolute bottom-12 right-12 w-6 h-6 border-b-2 border-r-2 border-violet-500/30" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.video
        ref={videoRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: videoReady ? 1 : 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        src="/intro.mp4"
        muted
        playsInline
        preload="auto"
        controls={false}
        onCanPlayThrough={handleCanPlayThrough}
        onPlay={preloadHomepageAssets}
        onEnded={onVideoEnded}
        className="w-full h-full object-cover pointer-events-none select-none z-10"
        style={{ willChange: 'opacity' }}
      />
    </div>
  );
}
