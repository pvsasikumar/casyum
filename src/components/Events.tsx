import React, { useEffect, useState } from 'react';
import MagicBento from './MagicBento';
import { listPublicEvents, type PublicEvent } from '../services/publicEventService';

export const Events: React.FC = () => {
  const [events, setEvents] = useState<PublicEvent[] | null>(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setEvents(null);
    listPublicEvents()
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load events right now.');
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

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

        {error && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <span className="text-xs text-white/40">{error}</span>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Magic Bento Container */}
        <div className="w-full flex justify-center">
          <MagicBento
            events={events || undefined}
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
