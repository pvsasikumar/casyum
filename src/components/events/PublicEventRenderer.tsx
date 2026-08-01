import React from 'react';
import type { CmsSection, EventCmsData } from '../cms/types';
import { hasContent, sortSections } from '../cms/types';
import { SectionView } from '../cms/sections/view';

const PADDING: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export const PublicSection: React.FC<{ section: CmsSection }> = ({ section }) => {
  const s = section.settings;
  return (
    <section
      id={s.anchorId || `event-${section.sectionType}`}
      className={`relative rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden scroll-mt-28 ${s.cssClass || ''}`}
      style={s.background ? { backgroundColor: s.background } : undefined}
    >
      <div className={PADDING[s.padding] || PADDING.md}>
        {(s.title || s.subtitle) && (
          <div className="flex flex-col gap-1 mb-5">
            {s.title && <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">{s.title}</h2>}
            {s.subtitle && <p className="text-sm text-white/50">{s.subtitle}</p>}
          </div>
        )}
        <SectionView section={section} />
      </div>
    </section>
  );
};

export const PublicEventRenderer: React.FC<{ data: EventCmsData }> = ({ data }) => {
  const visible = sortSections(data.sections).filter((section) => section.isVisible && hasContent(section));
  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-white/50 text-sm">Event details are coming soon.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {visible.map((section) => (
        <PublicSection key={section.id} section={section} />
      ))}
    </div>
  );
};

export default PublicEventRenderer;
