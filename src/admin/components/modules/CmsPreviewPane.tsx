import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { Hero } from '../../../components/Hero';
import { About } from '../../../components/About';
import { Events } from '../../../components/Events';
import { Sponsors } from '../../../components/Sponsors';
import { ParticipantRegistration } from '../../../components/ParticipantRegistration';
import { CMS_PAGE_LABELS, type CmsSitePageId } from '../../../services/cmsService';

type Viewport = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '820px',
  mobile: '390px',
};

interface CmsPreviewPaneProps {
  pageId: CmsSitePageId;
  content: Record<string, any>;
  sections: Record<string, boolean>;
  onClose: () => void;
}

/**
 * Live preview: renders the REAL public page components with the current
 * editor values (published or draft). Nothing is written anywhere while
 * previewing — this is a pure in-memory render inside the admin dashboard.
 */
export const CmsPreviewPane: React.FC<CmsPreviewPaneProps> = ({ pageId, content, sections, onClose }) => {
  const [viewport, setViewport] = useState<Viewport>('desktop');

  const renderPage = () => {
    switch (pageId) {
      case 'home':
        return (
          <>
            <Hero
              startAnimation
              content={content}
              showRegisterButton={sections.ctaButtons !== false}
            />
            {sections.footer !== false && (
              <footer className="border-t border-white/5 bg-black/50 py-12 px-6 text-center text-[10px] tracking-[0.25em] text-white/30 uppercase font-semibold font-display">
                <span>© 2026 CASYUM SYMPOSIUM. ALL RIGHTS RESERVED.</span>
              </footer>
            )}
          </>
        );
      case 'about':
        return <About content={content} sections={sections} />;
      case 'events':
        return <Events content={content} sections={sections} />;
      case 'sponsors':
        return <Sponsors content={content} sections={sections} onOpenEnquiry={() => {}} />;
      case 'register':
        return (
          <ParticipantRegistration content={content} showSignInPanel={sections.signInPanel !== false} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-zinc-950/90">
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-extrabold uppercase tracking-widest">
            Preview
          </span>
          <span className="text-sm font-bold text-white truncate">{CMS_PAGE_LABELS[pageId]} Page</span>
          <span className="hidden sm:inline text-[10px] text-white/40 uppercase tracking-widest">
            Draft view — public site unchanged until you publish
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/10 overflow-hidden">
            {(
              [
                { key: 'desktop', icon: Monitor, label: 'Desktop' },
                { key: 'tablet', icon: Tablet, label: 'Tablet' },
                { key: 'mobile', icon: Smartphone, label: 'Mobile' },
              ] as Array<{ key: Viewport; icon: typeof Monitor; label: string }>
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewport(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                  viewport === key ? 'bg-violet-600/30 text-violet-200' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <div
          className="mx-auto h-full rounded-2xl border border-white/10 bg-black overflow-hidden shadow-2xl transition-all duration-300"
          style={{ width: VIEWPORT_WIDTH[viewport], maxWidth: '100%' }}
        >
          <div className="h-full overflow-y-auto custom-scrollbar">{renderPage()}</div>
        </div>
      </div>
    </div>
  );
};
