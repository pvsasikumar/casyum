import React from 'react';
import { motion } from 'framer-motion';
import { LocationMap } from './ui/expand-map';

export const About: React.FC = () => {
  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center bg-black py-24 px-6 select-none overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />

      <div className="max-w-5xl w-full mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Column: Title and details */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          <div className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">
            The Legacy
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
            Where Innovation Meets Execution.
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed">
            CASYUM is the flagship national symposium hosted by the Department of Computer Applications at SRM Institute of Science and Technology. Year after year, we bring together the brightest minds in technology, design, and software engineering to compete, collaborate, and push the boundaries of what is possible.
          </p>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed">
            CASYUM 2K26 is themed around cosmic crystallization and futurism, embodying the assembly of ideas into functional brilliance. Step into the arena and claim your spot among the pioneers.
          </p>

          <div className="mt-4 flex justify-start">
            <LocationMap
              location="TRP Auditorium, SRM Ramapuram"
              coordinates="Bharathi Salai, Ramapuram, Chennai, Tamil Nadu 600089"
              mapLink="https://maps.app.goo.gl/CcoQbdFwNVGqn4JA9"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="glass-panel px-6 py-8 rounded-2xl flex flex-col gap-2">
            <span className="text-3xl font-extrabold text-white font-display">10+</span>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">National Events</span>
          </div>
          <div className="glass-panel px-6 py-8 rounded-2xl flex flex-col gap-2">
            <span className="text-3xl font-extrabold text-white font-display">₹1.5L+</span>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Cash Prizes</span>
          </div>
          <div className="glass-panel px-6 py-8 rounded-2xl flex flex-col gap-2">
            <span className="text-3xl font-extrabold text-white font-display">500+</span>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Delegates</span>
          </div>
          <div className="glass-panel px-6 py-8 rounded-2xl flex flex-col gap-2">
            <span className="text-3xl font-extrabold text-white font-display">24Hr</span>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Hackathon</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
