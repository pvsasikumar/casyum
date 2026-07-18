import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuVariants = {
    closed: {
      opacity: 0,
      y: -15,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: 'easeOut',
      },
    },
  } as const;

  const navLinkClass =
    'relative text-[10px] sm:text-xs uppercase tracking-[0.25em] font-semibold text-white/50 hover:text-white transition-colors duration-300 after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1px] after:bg-violet-400 after:transition-all after:duration-300 hover:after:w-full py-1';

  return (
    <div className="fixed top-0 left-0 w-full z-40">
      <nav className="h-16 glass-panel border-b border-white/5 backdrop-blur-md bg-black/40 flex items-center justify-between px-6 sm:px-12 select-none relative z-50">
        {/* Top Gloss Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

        {/* Left Side: Mobile Hamburger or Desktop Links */}
        <div className="flex items-center">
          {/* Mobile hamburger icon */}
          <button
            onClick={toggleMenu}
            className="sm:hidden text-white/60 hover:text-white p-1.5 transition-colors focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop Left Nav Links */}
          <div className="hidden sm:flex items-center gap-8">
            <a href="#about" className={navLinkClass}>About</a>
            <a href="#events" className={navLinkClass}>Events</a>
          </div>
        </div>

        {/* Center Space (Intentionally left blank for minimal premium aesthetic) */}
        <div className="hidden sm:block" />

        {/* Right Side: Desktop Links + CTA Button */}
        <div className="flex items-center gap-6 sm:gap-8">
          <a href="#schedule" className={`${navLinkClass} hidden sm:inline-block`}>Schedule</a>
          
          <a
            href="#register"
            onClick={() => setIsOpen(false)}
            className="relative inline-flex items-center justify-center px-5 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-black bg-white rounded-full hover:bg-neutral-200 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-98"
          >
            Register
          </a>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="absolute top-16 left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/5 flex flex-col items-center py-8 gap-6 z-40 sm:hidden shadow-2xl"
          >
            <a
              href="#about"
              onClick={toggleMenu}
              className="text-xs uppercase tracking-[0.3em] font-bold text-white/50 hover:text-white transition-colors duration-300"
            >
              About
            </a>
            <a
              href="#events"
              onClick={toggleMenu}
              className="text-xs uppercase tracking-[0.3em] font-bold text-white/50 hover:text-white transition-colors duration-300"
            >
              Events
            </a>
            <a
              href="#schedule"
              onClick={toggleMenu}
              className="text-xs uppercase tracking-[0.3em] font-bold text-white/50 hover:text-white transition-colors duration-300"
            >
              Schedule
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
