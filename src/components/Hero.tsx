import React from 'react';
import { motion } from 'framer-motion';
import { Countdown } from './Countdown';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const, // Premium easeOutExpo curve
    },
  },
};

interface HeroProps {
  startAnimation: boolean;
}

export const Hero: React.FC<HeroProps> = ({ startAnimation }) => {
  return (
    <section className="relative w-full h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-black select-none">
      {/* Permanent Hero Background - identical positioning, scaling, and aspect ratio to the video overlay */}
      <div className={`absolute inset-0 z-0 select-none pointer-events-none ${startAnimation ? 'animate-logo-float' : ''}`}>
        <img
          src="/images/final.jpeg"
          alt="Hero Background Centerpiece"
          className="w-full h-full object-cover opacity-[0.35]"
          style={{ willChange: 'transform' }}
        />
        {/* Shimmer sweep overlay every 6-8 seconds */}
        <div className="shimmer-sweep-overlay" style={{ animationDuration: '7s' }} />
        {/* Subtle radial vignette around screen edges */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_80%)]" />
      </div>

      {/* Content Container (elevated above logo at z-10) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={startAnimation ? 'visible' : 'hidden'}
        className="relative z-10 max-w-4xl w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 mt-12"
      >
        {/* Institution Info */}
        <motion.div
          variants={itemVariants}
          className="text-[9px] sm:text-xs font-bold tracking-[0.35em] text-violet-400 uppercase font-display"
        >
          SRM Institute of Science and Technology
        </motion.div>

        {/* Department Info */}
        <motion.div
          variants={itemVariants}
          className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-white/50 uppercase"
        >
          Department of Computer Applications
        </motion.div>

        {/* Presenting Subtitle */}
        <motion.div
          variants={itemVariants}
          className="text-[9px] sm:text-xs font-semibold tracking-[0.4em] text-white/70 uppercase mt-1 sm:mt-2"
        >
          presents the annual national symposium
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-7xl md:text-8xl font-extrabold tracking-tighter uppercase font-display text-gradient py-1.5 sm:py-3"
        >
          CASYUM 2K26
        </motion.h1>

        {/* Countdown Timer */}
        <motion.div variants={itemVariants} className="mt-2">
          <Countdown />
        </motion.div>

        {/* Calls-To-Action */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-4 mt-8"
        >
          <a
            href="#register"
            className="group relative inline-flex items-center justify-center px-8 py-3.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-black bg-white rounded-full overflow-hidden hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105"
          >
            {/* Gloss Shimmer */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            Register Now
          </a>

          <a
            href="#login"
            className="glass-panel px-8 py-3.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white rounded-full hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20 hover:scale-105 active:scale-98"
          >
            Login
          </a>
        </motion.div>
      </motion.div>

      {/* Futuristic Corner Tech Accents */}
      <div className="absolute top-24 left-8 w-4 h-4 border-t border-l border-white/10 hidden sm:block" />
      <div className="absolute top-24 right-8 w-4 h-4 border-t border-r border-white/10 hidden sm:block" />
      <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-white/10 hidden sm:block" />
      <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-white/10 hidden sm:block" />
    </section>
  );
};
