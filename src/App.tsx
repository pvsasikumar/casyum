import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IntroVideo } from './components/IntroVideo';
import { Hero } from './components/Hero';
import { Events } from './components/Events';
import { Sponsors } from './components/Sponsors';
import { ParticipantRegistration } from './components/ParticipantRegistration';
import { SponsorshipEnquiry } from './components/SponsorshipEnquiry';
import { ParticipantDashboard } from './participant/ParticipantDashboard';
import { SponsorShowcase } from './participant/SponsorShowcase';
import { EventDetailsPage } from './components/events/EventDetailsPage';
import { AdminDashboard } from './admin/AdminDashboard';
import { CoordinatorApp } from './coordinator/CoordinatorApp';
import { RegistrationTeamApp } from './registration-team/RegistrationTeamApp';
import { CasyumFacultyApp } from './casyum-faculty/CasyumFacultyApp';
import { ObserverApp } from './observer/ObserverApp';
import { SponsorshipHeadApp } from './sponsorship-head/SponsorshipHeadApp';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminRoute } from './rbac/components/AdminRoute';
import { CreatePassword } from './pages/auth/CreatePassword';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { useRBAC } from './rbac/context/RBACContext';
import { SUPER_ADMIN_ROLE, COORDINATOR_PORTAL_ROLES, REGISTRATION_TEAM_PORTAL_ROLES, CASYUM_FACULTY_PORTAL_ROLES, OBSERVER_PORTAL_ROLES, SPONSORSHIP_HEAD_PORTAL_ROLES } from './rbac/constants';
import { SiteCmsProvider, useSiteCms } from './hooks/useSiteCms';
import type { CmsSitePageId } from './services/cmsService';

/** Maps a direct URL entry to its CMS page so hidden pages redirect Home. */
const PATH_TO_PAGE: Record<string, CmsSitePageId> = {
  '/home': 'home',
  '/about': 'about',
  '/events': 'events',
  '/sponsors': 'sponsors',
  '/register': 'register',
};

/**
 * When a visitor manually opens the URL of a hidden page (e.g. /about),
 * redirect them back to Home. The root "/" never redirects (it hosts every
 * visible section), so no loop can occur even when Home itself is hidden.
 */
function HiddenPageRedirect() {
  const { ready, isPageVisible } = useSiteCms();
  const { pathname } = useLocation();
  const pageId = PATH_TO_PAGE[pathname];
  if (ready && pageId && !isPageVisible(pageId)) {
    return <Navigate to="/" replace />;
  }
  return null;
}

function PublicSiteContent() {
  const { pages, isPageVisible } = useSiteCms();
  const [sponsorEnquiryOpen, setSponsorEnquiryOpen] = useState(0);
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

  // The hero CTA row is its own section; the Register button additionally
  // disappears whenever the Register page itself is hidden.
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
            onOpenEnquiry={() => setSponsorEnquiryOpen((n) => n + 1)}
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
        <SponsorshipEnquiry openSignal={sponsorEnquiryOpen} />

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
      <HiddenPageRedirect />
      <PublicSiteContent />
    </SiteCmsProvider>
  );
}

function ParticipantRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, isLoading } = useRBAC();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || role !== 'Participant') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RedirectToParticipantOrHome() {
  const { isAuthenticated, role, isLoading } = useRBAC();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated && role === 'Participant' ? '/participant/dashboard' : '/'} replace />;
}

export default function App() {
  const navigate = useNavigate();
  const { logout } = useRBAC();

  const handleExitAdmin = () => {
    logout();
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('casyum_') && key !== 'casyum_dark_mode') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    navigate('/', { replace: true });
  };

  return (
    <Routes>
      <Route path="/create-password" element={<CreatePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={<PublicSite />} />
      <Route path="/home" element={<PublicSite />} />
      <Route path="/about" element={<PublicSite />} />
      <Route path="/events" element={<PublicSite />} />
      <Route path="/sponsors" element={<PublicSite />} />
      <Route path="/register" element={<PublicSite />} />
      <Route path="/events/:eventSlug" element={<EventDetailsPage />} />
      <Route path="/profile" element={<RedirectToParticipantOrHome />} />
      <Route path="/my-events" element={<RedirectToParticipantOrHome />} />

      <Route
        path="/participant/dashboard"
        element={
          <ParticipantRoute>
            <ParticipantDashboard />
          </ParticipantRoute>
        }
      />

      <Route
        path="/participant/sponsors"
        element={
          <ParticipantRoute>
            <SponsorShowcase />
          </ParticipantRoute>
        }
      />

      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/coordinator/*"
        element={
          <AdminRoute roles={COORDINATOR_PORTAL_ROLES}>
            <CoordinatorApp />
          </AdminRoute>
        }
      />

      <Route
        path="/registration-team/*"
        element={
          <AdminRoute roles={REGISTRATION_TEAM_PORTAL_ROLES}>
            <RegistrationTeamApp />
          </AdminRoute>
        }
      />

      <Route
        path="/casyum-faculty/*"
        element={
          <AdminRoute roles={CASYUM_FACULTY_PORTAL_ROLES}>
            <CasyumFacultyApp />
          </AdminRoute>
        }
      />

      <Route
        path="/observer/*"
        element={
          <AdminRoute roles={OBSERVER_PORTAL_ROLES}>
            <ObserverApp />
          </AdminRoute>
        }
      />

      <Route
        path="/sponsorship-head/*"
        element={
          <AdminRoute roles={SPONSORSHIP_HEAD_PORTAL_ROLES}>
            <SponsorshipHeadApp />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/coordinator/dashboard"
        element={<Navigate to="/coordinator/dashboard" replace />}
      />

      <Route
        path="/admin/*"
        element={
          <AdminRoute roles={[SUPER_ADMIN_ROLE]}>
            <AdminDashboard onExitAdmin={handleExitAdmin} />
          </AdminRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
