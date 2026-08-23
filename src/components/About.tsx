import React from 'react';
import { motion } from 'framer-motion';
import { LocationMap } from './ui/expand-map';
import type { CmsAboutContent } from '../services/cmsService';

interface AboutSections {
  intro?: boolean;
  stats?: boolean;
  locationMap?: boolean;
}

interface AboutProps {
  /** CMS overrides for the About text/stats (defaults keep the original look). */
  content?: Partial<CmsAboutContent>;
  sections?: AboutSections;
}

export const About: React.FC<AboutProps> = ({ content, sections }) => {
  const showIntro = sections?.intro !== false;
  const showStats = sections?.stats !== false;
  const showLocationMap = sections?.locationMap !== false;

  const kicker = content?.kicker || 'The Legacy';
  const title = content?.title || 'Where Innovation Meets Execution.';
  const paragraphs: string[] =
    content?.paragraphs && content.paragraphs.length > 0
      ? content.paragraphs
      : [
          'CASYUM is the flagship national symposium hosted by the Department of Computer Applications, School of Applied Science, under the Faculty of Liberal Arts and Business Studies at SRM Institute of Science and Technology. Year after year, we bring together the brightest minds in technology, design, and software engineering to compete, collaborate, and push the boundaries of what is possible.',
          'CASYUM 2K26 is themed around cosmic crystallization and futurism, embodying the assembly of ideas into functional brilliance. Step into the arena and claim your spot among the pioneers.',
        ];
  const stats =
    content?.stats && content.stats.length > 0
      ? content.stats
      : [
          { id: 'stat-events', value: '10+', label: 'National Events' },
          { id: 'stat-prizes', value: '₹1.5L+', label: 'Cash Prizes' },
          { id: 'stat-delegates', value: '500+', label: 'Delegates' },
          { id: 'stat-hackathon', value: '24Hr', label: 'Hackathon' },
        ];

  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center bg-black py-24 px-6 select-none overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-900/10 rounded-full blur-3xl" />

      <div className={`max-w-5xl w-full mx-auto relative z-10 grid grid-cols-1 ${showStats ? 'md:grid-cols-2' : ''} gap-12 items-center`}>
        {/* Left Column: Title and details */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-6"
        >
          {showIntro && (
            <>
              <div className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">
                {kicker}
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
                {title}
              </h2>
              {paragraphs.map((paragraph, idx) => (
                <p key={idx} className="text-white/60 text-sm sm:text-base leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </>
          )}

          {showLocationMap && (
            <div className="mt-4 flex justify-start">
              <LocationMap
                location="TRP Auditorium, SRM Ramapuram"
                coordinates="Bharathi Salai, Ramapuram, Chennai, Tamil Nadu 600089"
                mapLink="https://maps.app.goo.gl/CcoQbdFwNVGqn4JA9"
              />
            </div>
          )}
        </motion.div>

        {showStats && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat) => (
              <div key={stat.id || stat.label} className="glass-panel px-6 py-8 rounded-2xl flex flex-col gap-2">
                <span className="text-3xl font-extrabold text-white font-display">{stat.value}</span>
                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};
