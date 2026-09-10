import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Handshake, Sparkles } from 'lucide-react';
import { STATIC_SPONSORS, STATIC_SPONSOR_CATEGORIES } from '../config/sponsors';
import type { Sponsor } from '../types/sponsorship';
import type { CmsSponsorsContent } from '../services/cmsService';

interface SponsorsProps {
  onOpenEnquiry?: () => void;
  /** CMS overrides for the Sponsors header text (defaults keep the original look). */
  content?: Partial<CmsSponsorsContent>;
  sections?: {
    header?: boolean;
    titleSponsor?: boolean;
    sponsorGrid?: boolean;
    sponsorCta?: boolean;
  };
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

export const Sponsors: React.FC<SponsorsProps> = ({ onOpenEnquiry, content, sections }) => {
  const showHeader = sections?.header !== false;
  const showTitleSponsor = sections?.titleSponsor !== false;
  const showGrid = sections?.sponsorGrid !== false;
  const showCta = sections?.sponsorCta !== false;

  const kicker = content?.kicker || 'Our Sponsors';
  const title = content?.title || 'Powered by Visionaries';
  const subtitle =
    content?.subtitle ||
    'The organizations fueling CASYUM 2K26. We are grateful to every partner whose support brings this national symposium to life.';

  const sponsors = STATIC_SPONSORS;
  const categories = STATIC_SPONSOR_CATEGORIES;

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

  const titleGroup = showTitleSponsor ? grouped.find(([name]) => name === 'Title Sponsor') : undefined;
  const otherGroups = showTitleSponsor
    ? grouped.filter(([name]) => name !== 'Title Sponsor')
    : grouped;

  const hasSponsors = sponsors.length > 0;

  return (
    <section id="sponsors" className="relative py-24 sm:py-32 px-6 select-none bg-black overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] bg-violet-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-0 w-[30vw] h-[30vh] bg-cyan-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[24vw] h-[24vh] bg-purple-900/10 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-6xl mx-auto flex flex-col gap-14 sm:gap-20">
        {/* Header */}
        {showHeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-2xl mx-auto flex flex-col items-center gap-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-violet-400 uppercase">{kicker}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-gradient">
              {title}
            </h2>
            <p className="text-white/50 text-sm sm:text-base max-w-xl leading-relaxed">
              {subtitle}
            </p>
          </motion.div>
        )}

        {/* Empty state */}
        {!hasSponsors && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-12 text-center flex flex-col items-center gap-3 max-w-md mx-auto"
          >
            <Handshake className="w-8 h-8 text-white/20" />
            <p className="text-sm text-white/50">Sponsor announcements coming soon.</p>
          </motion.div>
        )}

        {/* Sponsor content */}
        {hasSponsors && showGrid && (
          <div className="w-full flex flex-col gap-14 sm:gap-20">
            {/* TITLE SPONSOR highlight */}
            {titleGroup && (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-3xl border border-violet-500/40 bg-gradient-to-b from-violet-600/20 via-zinc-950 to-black p-8 sm:p-12 flex flex-col items-center gap-6 text-center shadow-[0_0_80px_rgba(139,92,246,0.25)] relative overflow-hidden"
              >
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-tr from-violet-500/25 via-transparent to-cyan-400/15 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center gap-6 w-full">
                  <span className="px-5 py-2 rounded-full bg-violet-500/15 border border-violet-500/50 text-violet-300 text-[10px] font-extrabold uppercase tracking-[0.3em]">
                    {titleGroup[0].toUpperCase()}
                  </span>
                  {titleGroup[1].map((sponsor) => (
                    <a
                      key={sponsor.id}
                      href={sponsor.websiteUrl ? safeExternal(sponsor.websiteUrl) : undefined}
                      target={sponsor.websiteUrl ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center gap-5 w-full transition-transform duration-300 hover:scale-[1.02]"
                    >
                      <SponsorLogo src={sponsor.logoUrl} name={sponsor.name} size={sponsor.logoSize || 'large'} title />
                      <div className="flex flex-col items-center gap-1.5">
                        <h3 className="text-xl sm:text-3xl font-extrabold font-display tracking-tight group-hover:text-violet-200 transition-colors">
                          {sponsor.name}
                        </h3>
                        {sponsor.description && (
                          <p className="text-white/50 text-sm max-w-md">{sponsor.description}</p>
                        )}
                      </div>
                      {sponsor.websiteUrl && (
                        <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-violet-500/25 transition-all group-hover:shadow-violet-500/40">
                          <ExternalLink className="w-3.5 h-3.5" />
                          Visit Website
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Remaining category groups */}
            {otherGroups.map(([categoryName, rows], groupIdx) => {
              const isLarge = categoryName === 'Powered By' || categoryName === 'Presenting Sponsor' || categoryName === 'Gold Sponsor';
              const size = CATEGORY_SIZE_HINT[categoryName] || (isLarge ? 'large' : 'medium');
              return (
                <motion.div
                  key={categoryName}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full flex flex-col gap-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                    <h3 className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.3em] text-white/70 text-center">
                      {categoryName}
                    </h3>
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
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: (groupIdx * 0.1) + (idx * 0.06), ease: [0.16, 1, 0.3, 1] }}
                        className={`group flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 sm:p-6 bg-white/[0.03] border-white/10 transition-all duration-300 hover:border-violet-500/40 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] ${
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
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Sponsor CTA */}
        {showCta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 text-center"
          >
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <p className="text-white/50 text-sm sm:text-base">Interested in sponsoring CASYUM 2K26?</p>
            <button
              type="button"
              onClick={onOpenEnquiry}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Handshake className="w-4 h-4" />
              Become a Sponsor
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Sponsors;
