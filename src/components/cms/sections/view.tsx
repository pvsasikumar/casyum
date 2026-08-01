import React from 'react';
import {
  Image as ImageIcon,
  Trophy,
  UserRound,
  FileDown,
  ExternalLink,
  Handshake,
  ChevronDown,
} from 'lucide-react';
import type {
  CmsCardItem,
  CmsContact,
  CmsCoordinatorInfo,
  CmsDownload,
  CmsEventDetails,
  CmsFaq,
  CmsGalleryItem,
  CmsHero,
  CmsJudgingCriterion,
  CmsPrize,
  CmsRule,
  CmsScheduleItem,
  CmsSection,
  CmsSponsor,
  CmsStatItem,
} from '../types';
import { DETAIL_FIELDS, CONTACT_FIELDS, prizeIconClass, statusStyles } from './constants';
import { EmptyState } from '../fields';
import { SmartImage } from '../../ui/SmartImage';

const proseClass =
  'text-sm text-white/80 leading-relaxed [&_a]:text-violet-300 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:text-base [&_h4]:font-bold [&_strong]:text-white [&_em]:italic [&_u]:underline';

function videoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return /^https?:\/\/.+/.test(url) ? url : null;
}

export const SectionView: React.FC<{ section: CmsSection }> = ({ section }) => {
  switch (section.sectionType) {
    case 'hero':
      return <HeroView content={section.content} />;
    case 'details':
      return <DetailsView content={section.content} />;
    case 'about':
    case 'richText':
      return <RichTextView html={section.content.html} />;
    case 'rules':
      return <RulesView items={section.content.items} />;
    case 'requirements':
      return <RequirementsView items={section.content.items} />;
    case 'prizes':
      return <PrizesView items={section.content.items} />;
    case 'judging':
      return <JudgingView items={section.content.items} />;
    case 'timeline':
      return <TimelineView items={section.content.items} />;
    case 'faq':
      return <FaqView items={section.content.items} />;
    case 'coordinator':
      return <CoordinatorView content={section.content} />;
    case 'downloads':
      return <DownloadsView items={section.content.items} />;
    case 'gallery':
      return <GalleryView items={section.content.items} />;
    case 'sponsors':
      return <SponsorsView items={section.content.items} />;
    case 'contact':
      return <ContactView content={section.content} />;
    case 'heading':
      return <HeadingView content={section.content} />;
    case 'image':
      return <ImageView content={section.content} />;
    case 'video':
      return <VideoView content={section.content} />;
    case 'cards':
      return <CardsView items={section.content.items} />;
    case 'statistics':
      return <StatsView items={section.content.items} />;
    case 'divider':
      return <DividerView />;
    case 'html':
      return <HtmlView html={section.content.html} />;
  }
};

const HeroView: React.FC<{ content: CmsHero }> = ({ content: hero }) => (
  <div className="rounded-3xl overflow-hidden border border-white/10">
    {hero.bannerImage && (
      <div className="relative">
        <SmartImage
          src={hero.bannerImage}
          alt={hero.bannerImageAlt || hero.title}
          className="w-full aspect-video"
          placeholder="Loading image…"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>
    )}
    <div className={`p-5 sm:p-6 flex flex-col gap-3 bg-white/[0.03] backdrop-blur-md ${hero.bannerImage ? '-mt-10 relative rounded-t-3xl' : 'border-t border-white/10'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {hero.category && (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
            {hero.category}
          </span>
        )}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[hero.status] || statusStyles['Registration Open']}`}>
          {hero.status}
        </span>
      </div>
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-white">{hero.title || 'Event'}</h1>
      {hero.tagline && <p className="text-sm text-violet-300/90 font-medium">{hero.tagline}</p>}
      {hero.shortDescription && <p className="text-sm text-white/70 leading-relaxed">{hero.shortDescription}</p>}
    </div>
  </div>
);

const DetailsView: React.FC<{ content: CmsEventDetails }> = ({ content: details }) => {
  const rows = DETAIL_FIELDS.filter((f) => details[f.key]);
  if (rows.length === 0) return <EmptyState text="No event details added yet." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rows.map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.key} className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <Icon className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{f.label}</span>
              {f.key === 'mapsLink' ? (
                <a href={details[f.key]} target="_blank" rel="noreferrer" className="text-xs text-violet-300 hover:text-violet-200 underline truncate">
                  View Map
                </a>
              ) : (
                <span className="text-xs text-white/85 break-words">{details[f.key]}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const RichTextView: React.FC<{ html: string }> = ({ html }) => {
  if (!html) return <EmptyState text="No content added yet." />;
  return <div className={proseClass} dangerouslySetInnerHTML={{ __html: html }} />;
};

const RulesView: React.FC<{ items: CmsRule[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No rules added yet." />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((r, i) => (
        <div key={r.id} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="w-5 h-5 rounded-md bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-xs text-white/85 leading-relaxed">{r.text}</span>
        </div>
      ))}
    </div>
  );
};

const RequirementsView: React.FC<{ items: CmsRule[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No requirements listed yet." />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((r, i) => (
        <div key={r.id} className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <span className="text-xs text-white/85 leading-relaxed">{r.text}</span>
        </div>
      ))}
    </div>
  );
};

const PrizesView: React.FC<{ items: CmsPrize[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No prizes listed yet." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${prizeIconClass(item.label)}`}>
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white">{item.label}</span>
            {item.description && <span className="text-[11px] text-white/60 truncate">{item.description}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

const JudgingView: React.FC<{ items: CmsJudgingCriterion[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No judging criteria yet." />;
  return (
    <div className="flex flex-col gap-3">
      {items.map((c, i) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/85 font-semibold">
                {i + 1}. {c.criterion}
              </span>
              <span className="text-xs font-mono text-violet-300">{c.percentage}%</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.min(Number(c.percentage) || 0, 100)}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const TimelineView: React.FC<{ items: CmsScheduleItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No schedule entries yet." />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-3 pl-5">
          <div className="absolute left-0 top-1 bottom-0 w-px bg-white/10" />
          <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-violet-400 -translate-x-1/2 shadow-[0_0_8px_#a78bfa]" />
          <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2 flex-wrap">
              {item.time && <span className="text-[10px] font-mono font-bold text-violet-300">{item.time}</span>}
              <span className="text-xs font-bold text-white">
                {index + 1}. {item.title}
              </span>
            </div>
            {item.description && <p className="mt-1 text-[11px] text-white/60 leading-relaxed">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

const FaqView: React.FC<{ items: CmsFaq[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No FAQs yet." />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((f) => (
        <details key={f.id} className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-white cursor-pointer list-none">
            <span>{f.question}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/40 group-open:rotate-180 transition-transform flex-shrink-0" />
          </summary>
          <div className="px-4 pb-3 text-[11px] text-white/60 leading-relaxed">{f.answer}</div>
        </details>
      ))}
    </div>
  );
};

const PersonView: React.FC<{ person: { name: string; phone: string; email: string }; title: string }> = ({ person, title }) => (
  <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
    <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
      <UserRound className="w-4 h-4" />
    </div>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{title}</span>
      <span className="text-xs font-bold text-white">{person.name || '—'}</span>
      <div className="flex flex-col text-[11px] text-white/60">
        {person.phone && <span>📞 {person.phone}</span>}
        {person.email && <span className="truncate">✉️ {person.email}</span>}
      </div>
    </div>
  </div>
);

const CoordinatorView: React.FC<{ content: CmsCoordinatorInfo }> = ({ content: info }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <PersonView person={info.facultyCoordinator} title="Faculty Coordinator" />
    {info.coordinators.map((c) => (
      <PersonView key={c.id} person={c} title="Event Coordinator" />
    ))}
  </div>
);

const DownloadsView: React.FC<{ items: CmsDownload[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No downloads yet." />;
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-violet-500/40 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <FileDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{item.name}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{item.type}</span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
        </a>
      ))}
    </div>
  );
};

const GalleryView: React.FC<{ items: CmsGalleryItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No gallery images yet." />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
          <SmartImage
            src={item.url}
            alt={item.caption || item.category}
            className="w-full aspect-video"
            placeholder="Loading…"
          />
          {(item.caption || item.category) && (
            <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-white/70 truncate">{item.caption}</span>
              <span className="text-[9px] text-cyan-300 uppercase tracking-wider flex-shrink-0">{item.category}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SponsorsView: React.FC<{ items: CmsSponsor[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No sponsors yet." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          {item.logoUrl ? (
            <SmartImage
              src={item.logoUrl}
              alt={item.name}
              className="w-10 h-10 rounded-lg p-1 object-contain bg-white/5 border border-white/10 flex-shrink-0"
              wrapperClassName="flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Handshake className="w-4 h-4 text-white/40" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white">{item.name}</span>
            {item.description && <span className="text-[11px] text-white/60 truncate">{item.description}</span>}
            {item.website && (
              <a href={item.website} target="_blank" rel="noreferrer" className="text-[10px] text-violet-300 underline truncate">
                {item.website}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ContactView: React.FC<{ content: CmsContact }> = ({ content: contact }) => {
  const rows = CONTACT_FIELDS.filter((f) => contact[f.key]);
  if (rows.length === 0) return <EmptyState text="No contact details added yet." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {rows.map((f) => (
        <div key={f.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">{f.label}</span>
          <span className="block text-xs text-white/85 mt-0.5 break-words">{contact[f.key]}</span>
        </div>
      ))}
    </div>
  );
};

const HeadingView: React.FC<{ content: { text: string; level: 'h2' | 'h3'; align: 'left' | 'center' } }> = ({ content }) => {
  if (!content.text) return <EmptyState text="Empty heading" />;
  const Tag = content.level === 'h3' ? 'h3' : 'h2';
  return (
    <Tag className={`${content.align === 'center' ? 'text-center' : 'text-left'} font-extrabold font-display text-white ${content.level === 'h3' ? 'text-xl' : 'text-2xl'}`}>
      {content.text}
    </Tag>
  );
};

const ImageView: React.FC<{ content: { url: string; caption: string; alt: string; aspect: string } }> = ({ content }) => {
  if (!content.url) return <EmptyState text="No image added yet." />;
  return (
    <div className="flex flex-col gap-2">
      <div className={`${content.aspect || 'aspect-video'} w-full overflow-hidden rounded-xl bg-white/5 border border-white/10`}>
        <SmartImage src={content.url} alt={content.alt || content.caption || 'Image'} className="w-full h-full" placeholder="Loading…" />
      </div>
      {content.caption && <span className="text-[11px] text-white/50 text-center">{content.caption}</span>}
    </div>
  );
};

const VideoView: React.FC<{ content: { url: string; caption: string } }> = ({ content }) => {
  if (!content.url) return <EmptyState text="No video URL added yet." />;
  const src = videoEmbedUrl(content.url);
  return (
    <div className="flex flex-col gap-2">
      {src ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/40 border border-white/10">
          <iframe src={src} title={content.caption || 'Video'} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <a href={content.url} target="_blank" rel="noreferrer" className="text-xs text-violet-300 underline break-all">
          {content.url}
        </a>
      )}
      {content.caption && <span className="text-[11px] text-white/50 text-center">{content.caption}</span>}
    </div>
  );
};

const CardsView: React.FC<{ items: CmsCardItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No cards added yet." />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-1.5">
          <span className="text-sm font-bold text-white">{item.title}</span>
          {item.description && <span className="text-[11px] text-white/60 leading-relaxed">{item.description}</span>}
        </div>
      ))}
    </div>
  );
};

const StatsView: React.FC<{ items: CmsStatItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyState text="No statistics added yet." />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col items-center gap-1 text-center">
          <span className="text-xl font-extrabold font-mono text-violet-300">{item.value}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const DividerView: React.FC = () => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-px bg-white/10" />
    <ImageIcon className="w-3.5 h-3.5 text-white/25" />
    <div className="flex-1 h-px bg-white/10" />
  </div>
);

const HtmlView: React.FC<{ html: string }> = ({ html }) => {
  if (!html) return <EmptyState text="No custom HTML yet." />;
  return <div className="text-sm text-white/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
};
