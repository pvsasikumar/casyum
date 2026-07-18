import React from 'react';
import { motion } from 'framer-motion';

interface IntroVideoProps {
  onVideoEnded: () => void;
}

export const IntroVideo: React.FC<IntroVideoProps> = ({ onVideoEnded }) => {
  return (
    <div className="w-full h-full">
      {/* Cinematic video player, hardware accelerated, cover scaled */}
      <motion.video
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        controls={false}
        onEnded={onVideoEnded}
        className="w-full h-full object-cover pointer-events-none select-none"
        style={{ willChange: 'opacity' }}
      />
    </div>
  );
};
