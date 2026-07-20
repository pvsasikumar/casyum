import React from 'react';
import MagicBento from './MagicBento';

export const Events: React.FC = () => {
  return (
    <section id="events" className="relative min-h-screen bg-black py-24 px-6 select-none overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />

      <div className="max-w-6xl w-full mx-auto relative z-10 flex flex-col gap-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-4">
          <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">Challenge Yourself</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
            Arena of Battles
          </h2>
          <p className="text-white/50 text-sm sm:text-base">
            Participate in multiple categories and compete with peers nationwide to win cash prizes and recognition. Hover over the bento cards to activate stars, 3D tilt, magnetism, and global spotlighting.
          </p>
        </div>

        {/* Magic Bento Container */}
        <div className="w-full flex justify-center">
          <MagicBento 
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={true}
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={300}
            particleCount={12}
            glowColor="132, 0, 255"
          />
        </div>
      </div>
    </section>
  );
};
export default Events;
