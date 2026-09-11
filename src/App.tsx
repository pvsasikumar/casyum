import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IntroVideo } from './components/IntroVideo';
import { Hero } from './components/Hero';
import { Events } from './components/Events';
import { Sponsors } from './components/Sponsors';
import { ParticipantRegistration } from './components/ParticipantRegistration';
import { EventDetailsPage } from './components/events/EventDetailsPage';
import { SiteCmsProvider, useSiteCms } from './hooks/useSiteCms';

function PublicSiteContent() {
  const { pages, isPageVisible } = useSiteCms();
  const [showIntro, setShowIntro] = useState(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return false;
    const forceIntro = new URLSearchParams(window.location.search).has('intro');
    if (forceIntro) return true;
    const hasPlayed = sessionStorage.getItem('casyum_intro_played') === 'true';
    return !hasPlayed;
  });

  const [isVideoEnded, setIsVideoEnded] = useState(false);

  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showIntro]);

  useEffect(() => {
    if (!showIntro) return;
    const fallbackTimer = setTimeout(() => { handleVideoEnded(); }, 15000);
    return () => clearTimeout(fallbackTimer);
  }, [showIntro]);

  const handleVideoEnded = () => {
    setIsVideoEnded(true);
    sessionStorage.setItem('casyum_intro_played', 'true');
    setShowIntro(false);
  };

  const startAnimation = !showIntro || isVideoEnded;

  const homeSections = pages.home?.sections || {};
  const eventsSections = pages.events?.sections || {};
  const sponsorsSections = pages.sponsors?.sections || {};
  const registerSections = pages.register?.sections || {};

  const showHome = isPageVisible('home');
  const showEvents = isPageVisible('events');
  const showSponsors = isPageVisible('sponsors');
  const showRegister = isPageVisible('register');

  const showHomeCtas = showHome && homeSections.ctaButtons !== false;
  const showHeroRegisterButton = showHomeCtas && showRegister;
  const showFooter = homeSections.footer !== false;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <AnimatePresence mode="wait">
        {showIntro && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: [1, 1, 0] }}
            transition={{ duration: 0.7, times: [0, 0.4, 1], ease: 'easeOut' }}
            className="fixed inset-0 z-50 bg-black overflow-hidden"
          >
            <IntroVideo onVideoEnded={handleVideoEnded} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10">
        {showHome && (
          <Hero
            startAnimation={startAnimation}
            content={pages.home?.content}
            showRegisterButton={showHeroRegisterButton}
          />
        )}
        {showEvents && (
          <Events content={pages.events?.content} sections={eventsSections} />
        )}
        {showSponsors && (
          <Sponsors
            content={pages.sponsors?.content}
            sections={{ ...sponsorsSections }}
          />
        )}
        {showRegister && (
          <ParticipantRegistration
            content={pages.register?.content}
            showSignInPanel={registerSections.signInPanel !== false}
          />
        )}

        {showFooter && (
          <footer className="border-t border-white/5 bg-black/50 py-12 px-6 text-center text-[10px] tracking-[0.25em] text-white/30 uppercase font-semibold font-display">
            <div className="max-w-4xl mx-auto flex flex-col gap-6 items-center">
              <span>© 2026 CASYUM SYMPOSIUM. ALL RIGHTS RESERVED.</span>
              <span className="text-[9px] text-violet-400/40">SRM INSTITUTE OF SCIENCE AND TECHNOLOGY · FACULTY OF LIBERAL ARTS AND BUSINESS STUDIES · SCHOOL OF APPLIED SCIENCE · DEPARTMENT OF COMPUTER APPLICATIONS</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function PublicSite() {
  return (
    <SiteCmsProvider>
      <PublicSiteContent />
    </SiteCmsProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/home" element={<PublicSite />} />
      <Route path="/about" element={<PublicSite />} />
      <Route path="/events" element={<PublicSite />} />
      <Route path="/sponsors" element={<PublicSite />} />
      <Route path="/register" element={<PublicSite />} />
      <Route path="/events/:eventSlug" element={<EventDetailsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}