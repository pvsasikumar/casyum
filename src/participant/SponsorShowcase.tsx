import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, LayoutDashboard, Loader2, AlertCircle, Sparkles, Handshake } from 'lucide-react';
import { listActiveSponsors, listSponsorCategories } from '../services/sponsorshipService';
import type { Sponsor, SponsorCategory } from '../types/sponsorship';

interface SponsorShowcaseProps {
  preview?: boolean;
  onContinue?: () => void;
}

type LogoSize = 'small' | 'medium' | 'large';

const CATEGORY_SIZE_HINT: Record<string, LogoSize> = {
  'Title Sponsor': 'large',
  'Powered By': 'large',
  'Presenting Sponsor': 'large',
  'Gold Sponsor': 'large',
  'Silver Sponsor': 'medium',
  'Bronze Sponsor': 'small',
  'Associate Sponsor': 'small',
  'Media Partner': 'small',
  'Education Partner': 'small',
  'Technology Partner': 'small',
  'Community Partner': 'small',
};

const SIZE_CLASS: Record<LogoSize, string> = {
  small: 'h-12 sm:h-16',
  medium: 'h-16 sm:h-20',
  large: 'h-20 sm:h-28',
};

const SIZE_CLASS_TITLE: Record<LogoSize, string> = {
  small: 'h-20 sm:h-28',
  medium: 'h-24 sm:h-36',
  large: 'h-32 sm:h-44',
};

function safeExternal(url: string): string {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function SponsorLogo({ src, name, size, title }: { src: string; name: string; size: LogoSize; title?: boolean }) {
  const [failed, setFailed] = useState(false);
  const classes = title ? SIZE_CLASS_TITLE[size] : SIZE_CLASS[size];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${
        title ? 'w-full max-w-[420px]' : 'w-full'
      } ${classes}`}
    >
      {!failed && src ? (
        <img
          src={src}
          alt={`${name} logo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 text-white/25">
          <Handshake className={title ? 'w-12 h-12' : 'w-8 h-8'} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{name}</span>
        </div>
      )}
    </div>
  );
}

export const SponsorShowcase: React.FC<SponsorShowcaseProps> = ({ preview = false, onContinue }) => {
  const navigate = useNavigate();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [categories, setCategories] = useState<SponsorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([listActiveSponsors(), listSponsorCategories().catch(() => [] as SponsorCategory[])])
      .then(([sponsorRows, categoryRows]) => {
        if (!active) return;
        setSponsors(sponsorRows);
        setCategories(categoryRows);
        setLoadError('');
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load sponsors.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preview && !loading && !loadError && sponsors.length === 0) {
      navigate('/participant/dashboard', { replace: true });
    }
  }, [loading, loadError, sponsors.length, preview, navigate]);

  const grouped = useMemo(() => {
    const categoryOrder = new Map<string, number>();
    categories.forEach((c, idx) => categoryOrder.set(c.name, idx));
    const map = new Map<string, Sponsor[]>();
    sponsors.forEach((s) => {
      const key = s.category || 'Sponsors';
      const list = map.get(key) || [];
      list.push(s);
      map.set(key, list);
    });
    return Array.from(map.entries()).sort((a, b) => {
      const ao = categoryOrder.has(a[0]) ? (categoryOrder.get(a[0]) as number) : 999;
      const bo = categoryOrder.has(b[0]) ? (categoryOrder.get(b[0]) as number) : 999;
      if (ao !== bo) return ao - bo;
      return a[1][0].displayOrder - b[1][0].displayOrder;
    });
  }, [sponsors, categories]);

  const titleGroup = grouped.find(([name]) => name === 'Title Sponsor');
  const otherGroups = grouped.filter(([name]) => name !== 'Title Sponsor');

  const handleContinue = () => {
    if (typeof onContinue === 'function') {
      onContinue();
      return;
    }
    navigate('/participant/dashboard', { replace: true });
  };

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200 overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[60vh] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16 flex flex-col items-center gap-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_25px_rgba(139,92,246,0.4)]">
            <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-[0.35em] text-violet-400 uppercase">CASYUM 2026</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display">
            <span className="text-gradient">Sponsors</span>
          </h1>
          <p className="text-white/50 text-sm sm:text-base max-w-md">
            Powered by the organizations supporting CASYUM.
          </p>
        </motion.header>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <span className="text-xs text-white/50">Loading sponsors...</span>
          </div>
        )}

        {/* Load error — never block the participant */}
        {!loading && loadError && (
          <div className="w-full max-w-md rounded-2xl border border-rose-500/25 bg-rose-500/10 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-300 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-3 flex-1">
              <p className="text-xs text-rose-200/90">
                {preview
                  ? 'Could not load sponsors for the preview.'
                  : 'Sponsors could not be loaded right now. You can continue to your dashboard.'}
              </p>
              <button
                onClick={handleContinue}
                className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                {preview ? 'Close Preview' : 'Continue to Dashboard'}
              </button>
            </div>
          </div>
        )}

        {/* Empty state (preview only) */}
        {!loading && !loadError && sponsors.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12 text-center flex flex-col items-center gap-3 max-w-md">
            <Handshake className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/50">
              {preview
                ? 'No active sponsors yet. Add and approve sponsors to see them here.'
                : 'No sponsors to show right now.'}
            </p>
            {preview && (
              <button
                onClick={handleContinue}
                className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Close Preview
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && !loadError && sponsors.length > 0 && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="visible"
            className="w-full flex flex-col gap-12"
          >
            {/* TITLE SPONSOR highlight */}
            {titleGroup && (
              <motion.section
                variants={item}
                className="w-full rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-600/15 via-black to-black p-6 sm:p-10 flex flex-col items-center gap-5 text-center shadow-[0_0_60px_rgba(139,92,246,0.15)]"
              >
                <span className="px-4 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/40 text-violet-300 text-[10px] font-extrabold uppercase tracking-[0.25em]">
                  {titleGroup[0].toUpperCase()}
                </span>
                {titleGroup[1].map((sponsor) => (
                  <div key={sponsor.id} className="flex flex-col items-center gap-4 w-full">
                    <SponsorLogo src={sponsor.logoUrl} name={sponsor.name} size={sponsor.logoSize || 'large'} title />
                    <div className="flex flex-col items-center gap-1">
                      <h2 className="text-xl sm:text-3xl font-extrabold font-display tracking-tight">
                        {sponsor.name}
                      </h2>
                      {sponsor.description && (
                        <p className="text-white/50 text-sm max-w-md">{sponsor.description}</p>
                      )}
                    </div>
                    {sponsor.websiteUrl && (
                      <a
                        href={safeExternal(sponsor.websiteUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visit Sponsor
                      </a>
                    )}
                  </div>
                ))}
              </motion.section>
            )}

            {/* Remaining category groups */}
            {otherGroups.map(([categoryName, rows], groupIdx) => {
              const isLarge = categoryName === 'Powered By' || categoryName === 'Presenting Sponsor' || categoryName === 'Gold Sponsor';
              const size = CATEGORY_SIZE_HINT[categoryName] || (isLarge ? 'large' : 'medium');
              return (
                <motion.section key={categoryName} variants={item} className="w-full flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                    <h2 className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.3em] text-white/70 text-center">
                      {categoryName}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                  </div>

                  <div
                    className={`grid gap-4 ${
                      rows.length === 1
                        ? 'grid-cols-1 justify-items-center'
                        : size === 'large'
                          ? 'grid-cols-1 sm:grid-cols-2'
                          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                    }`}
                  >
                    {rows.map((sponsor, idx) => (
                      <motion.a
                        key={sponsor.id}
                        href={sponsor.websiteUrl ? safeExternal(sponsor.websiteUrl) : undefined}
                        target={sponsor.websiteUrl ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: (groupIdx * 0.1) + (idx * 0.06), ease: [0.16, 1, 0.3, 1] }}
                        className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 sm:p-6 bg-white/[0.03] border-white/10 transition-all duration-300 hover:border-violet-500/40 hover:bg-white/[0.06] ${
                          sponsor.websiteUrl ? 'cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <SponsorLogo src={sponsor.logoUrl} name={sponsor.name} size={sponsor.logoSize || size} />
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs sm:text-sm font-bold text-white/80 group-hover:text-white text-center">
                            {sponsor.name}
                          </span>
                          {sponsor.websiteUrl && (
                            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-violet-400/70 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ExternalLink className="w-2.5 h-2.5" />
                              Visit
                            </span>
                          )}
                        </div>
                      </motion.a>
                    ))}
                  </div>
                </motion.section>
              );
            })}

            {/* Continue */}
            {!preview && (
              <motion.div
                variants={item}
                className="flex justify-center pt-2"
              >
                <button
                  onClick={handleContinue}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-violet-500/30 transition-all cursor-pointer active:scale-95"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Continue to Dashboard
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {preview && !loading && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleContinue}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Close Preview
            </motion.button>
          )}
        </AnimatePresence>

        <footer className="text-[10px] tracking-[0.25em] uppercase text-white/25 font-semibold text-center pb-4">
          © 2026 CASYUM SYMPOSIUM · Powered by our sponsors
        </footer>
      </div>
    </div>
  );
};

export default SponsorShowcase;
