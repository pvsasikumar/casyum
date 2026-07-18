import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Layout, Cpu, Palette, ShieldAlert, Zap } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description: string;
  prize: string;
  icon: React.ComponentType<any>;
  glowColor: string;
}

const EVENTS_DATA: EventItem[] = [
  {
    id: '1',
    title: 'Nova Hack',
    description: 'A grueling 24-hour hackathon where developers assemble to build solutions to real-world challenges under intense pressure.',
    prize: '₹50,000 + Internship Opportunities',
    icon: Zap,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(168,85,247,0.18)] border-purple-500/10 group-hover:border-purple-500/40 text-purple-400',
  },
  {
    id: '2',
    title: 'Cosmic Coders',
    description: 'Test your algorithmic prowess and speed. Solve complex mathematical and logical puzzles in our flagship coding tournament.',
    prize: '₹20,000 + Goodies',
    icon: Terminal,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(6,182,212,0.18)] border-cyan-500/10 group-hover:border-cyan-500/40 text-cyan-400',
  },
  {
    id: '3',
    title: 'Web Weaver',
    description: 'Craft beautiful, high-performance web applications using modern styling and frontend tech. UI, responsiveness, and speed win.',
    prize: '₹15,000 + Goodies',
    icon: Layout,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(236,72,153,0.18)] border-pink-500/10 group-hover:border-pink-500/40 text-pink-400',
  },
  {
    id: '4',
    title: 'Quantum Quiz',
    description: 'A battle of brains. Test your knowledge in deep computer science concepts, trivia, technology history, and tech-giants.',
    prize: '₹10,000',
    icon: Cpu,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(59,130,246,0.18)] border-blue-500/10 group-hover:border-blue-500/40 text-blue-400',
  },
  {
    id: '5',
    title: 'Pixel Perfect',
    description: 'Showcase your UI/UX and product design skills. Create stunning, user-friendly mobile and web designs based on rapid prompts.',
    prize: '₹10,000',
    icon: Palette,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(234,179,8,0.18)] border-yellow-500/10 group-hover:border-yellow-500/40 text-yellow-400',
  },
  {
    id: '6',
    title: 'Cyber Citadel',
    description: 'Infiltrate systems, decrypt secrets, and defend servers in this jeopardy-style cybersecurity Capture the Flag tournament.',
    prize: '₹15,000 + Vouchers',
    icon: ShieldAlert,
    glowColor: 'group-hover:shadow-[0_0_35px_rgba(239,68,68,0.18)] border-red-500/10 group-hover:border-red-500/40 text-red-400',
  },
];

export const Events: React.FC = () => {
  return (
    <section id="events" className="relative min-h-screen bg-black py-24 px-6 select-none overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/5 rounded-full blur-3xl" />

      <div className="max-w-6xl w-full mx-auto relative z-10">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-4">
          <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">Challenge Yourself</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
            Arena of Battles
          </h2>
          <p className="text-white/50 text-sm sm:text-base">
            Participate in multiple categories and compete with peers nationwide to win cash prizes and recognition.
          </p>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENTS_DATA.map((event, index) => {
            const Icon = event.icon;
            const glowClass = event.glowColor.split(' ')[0];
            const borderTextClasses = event.glowColor.split(' ').slice(1).join(' ');
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group relative flex flex-col justify-between glass-panel p-6 rounded-2xl border transition-all duration-500 glass-panel-hover"
                style={{ contentVisibility: 'auto' }}
              >
                {/* Custom Hover Glowing Shadow Border */}
                <div className={`absolute inset-0 rounded-2xl transition-all duration-500 pointer-events-none -z-10 opacity-0 group-hover:opacity-100 ${glowClass}`} />

                {/* Top Gloss Flare */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                {/* Content */}
                <div>
                  {/* Icon Block */}
                  <div className={`w-12 h-12 rounded-xl bg-white/5 border flex items-center justify-center mb-6 transition-colors duration-500 ${borderTextClasses}`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold tracking-tight text-white mb-2 group-hover:text-violet-300 transition-colors duration-300">
                    {event.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/50 text-xs sm:text-sm leading-relaxed mb-6">
                    {event.description}
                  </p>
                </div>

                {/* Footer details */}
                <div className="border-t border-white/5 pt-4 flex items-center justify-between mt-auto">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/30">Prize Pool</span>
                  <span className="text-xs font-semibold text-white/90">{event.prize}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
