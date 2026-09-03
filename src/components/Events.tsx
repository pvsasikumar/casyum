import React, { useEffect, useState } from 'react';
import MagicBento from './MagicBento';
import { listPublicEvents, type PublicEvent } from '../services/publicEventService';
import {
  MAX_REGULAR_EVENTS,
  REGULAR_EVENT_FEE,
  GAMING_EVENT_FEE,
  REGULAR_PLUS_GAMING_FEE,
} from '../services/eventSelection';
import type { CmsEventsContent } from '../services/cmsService';

interface EventsSections {
  header?: boolean;
  pricing?: boolean;
  listing?: boolean;
}

interface EventsProps {
  /** CMS overrides for the Events header text (defaults keep the original look). */
  content?: Partial<CmsEventsContent>;
  sections?: EventsSections;
}

export const Events: React.FC<EventsProps> = ({ content, sections }) => {
  const showHeader = sections?.header !== false;
  const showPricing = sections?.pricing !== false;
  const showListing = sections?.listing !== false;

  const kicker = content?.kicker || 'Challenge Yourself';
  const title = content?.title || 'Arena of Battles';
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
        {showHeader && (
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase">{kicker}</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
              {title}
            </h2>
          </div>
        )}

        {showListing && error && (
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

        {/* Registration pricing */}
        {showPricing && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] px-5 py-4 flex flex-col gap-1">
              <span className="text-xl font-extrabold font-display text-emerald-300">₹{REGULAR_EVENT_FEE}</span>
              <span className="text-xs font-bold text-white/80">Regular Events</span>
              <span className="text-[10px] text-white/40">Choose up to {MAX_REGULAR_EVENTS} events</span>
            </div>
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] px-5 py-4 flex flex-col gap-1">
              <span className="text-xl font-extrabold font-display text-emerald-300">₹{GAMING_EVENT_FEE}</span>
              <span className="text-xs font-bold text-white/80">Gaming Event</span>
              <span className="text-[10px] text-white/40">Choose either Free Fire or BGMI</span>
            </div>
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] px-5 py-4 flex flex-col gap-1">
              <span className="text-xl font-extrabold font-display text-emerald-300">₹{REGULAR_PLUS_GAMING_FEE}</span>
              <span className="text-xs font-bold text-white/80">Regular + Gaming</span>
              <span className="text-[10px] text-white/40">Total for both categories</span>
            </div>
          </div>
        )}

        {/* Magic Bento Container */}
        {showListing && (
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
        )}
      </div>
    </section>
  );
};
export default Events;
