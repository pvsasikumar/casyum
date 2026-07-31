import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IntroVideo } from './components/IntroVideo';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Events } from './components/Events';
import { ParticipantRegistration } from './components/ParticipantRegistration';
import { ParticipantDashboard } from './participant/ParticipantDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { CoordinatorApp } from './coordinator/CoordinatorApp';
import { LoginModal } from './components/LoginModal';
import { CreatePassword } from './pages/auth/CreatePassword';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { ShieldCheck } from 'lucide-react';
import { useRBAC } from './rbac/context/RBACContext';

function PublicSite({ onOpenLogin }: { onOpenLogin: () => void }) {
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

  const handleReplayIntro = () => {
    sessionStorage.removeItem('casyum_intro_played');
    setIsVideoEnded(false);
    setShowIntro(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startAnimation = !showIntro || isVideoEnded;

  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={startAnimation ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="fixed top-0 left-0 w-full z-40 pointer-events-none overflow-visible"
      >
        <div className="pointer-events-auto">
          <Navbar />
        </div>
      </motion.div>

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
        <Hero startAnimation={startAnimation} onOpenLogin={onOpenLogin} />
        <About />
        <Events />
        <ParticipantRegistration />

        <footer className="border-t border-white/5 bg-black/50 py-12 px-6 text-center text-[10px] tracking-[0.25em] text-white/30 uppercase font-semibold font-display">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 items-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={handleReplayIntro} className="px-6 py-2.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300 text-[10px] uppercase font-bold tracking-widest cursor-pointer active:scale-95">
                Replay Intro Video
              </button>
              <button onClick={onOpenLogin} className="px-6 py-2.5 rounded-full border border-violet-500/30 text-violet-400 hover:text-violet-300 hover:border-violet-500/50 bg-violet-500/10 hover:bg-violet-500/20 transition-all duration-300 text-[10px] uppercase font-bold tracking-widest cursor-pointer active:scale-95 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </button>
            </div>
            <span>© 2026 CASYUM SYMPOSIUM. ALL RIGHTS RESERVED.</span>
            <span className="text-[9px] text-violet-400/40">SRM INSTITUTE OF SCIENCE AND TECHNOLOGY · DEPT OF COMPUTER APPLICATIONS</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role, logout, isLoading } = useRBAC();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCoordinatorMode, setIsCoordinatorMode] = useState(false);
  const [isParticipantMode, setIsParticipantMode] = useState(false);

  const authPaths = ['/create-password', '/forgot-password', '/reset-password'];
  const isAuthPage = authPaths.includes(location.pathname);

  const isProtectedPath =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/registrations') ||
    location.pathname.startsWith('/certificates') ||
    location.pathname.startsWith('/payments') ||
    location.pathname.startsWith('/finance') ||
    location.pathname.startsWith('/coordinator') ||
    location.pathname.startsWith('/participant') ||
    location.pathname.startsWith('/dashboard');

  const isCoordinatorRole = (r: string | null | undefined) =>
    r === 'Event Coordinator' ||
    r === 'Coordinator' ||
    r === 'Event Coordinator (Student)' ||
    r === 'Event Coordinator (Faculty)';

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && role) {
      if (isCoordinatorRole(role)) {
        setIsCoordinatorMode(true);
      } else if (role === 'Participant') {
        setIsParticipantMode(true);
      } else {
        setIsAdminMode(true);
      }
      return;
    }
    if (!isAuthPage && isProtectedPath) {
      setIsLoginOpen(true);
    }
    navigate('/', { replace: true });
  }, [isLoading, isAuthenticated, role, isAuthPage, isProtectedPath, navigate]);

  const handleLoginSuccess = () => {
    if (!role) return;
    if (isCoordinatorRole(role)) {
      setIsCoordinatorMode(true);
    } else if (role === 'Participant') {
      setIsParticipantMode(true);
    } else {
      setIsAdminMode(true);
    }
  };

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
    setIsAdminMode(false);
    setIsCoordinatorMode(false);
    setIsParticipantMode(false);
    navigate('/');
  };

  useEffect(() => {
    if (isParticipantMode) {
      navigate('/participant/dashboard', { replace: true });
    }
  }, [isParticipantMode, navigate]);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/create-password" element={<CreatePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  if (isLoading) {
    return null;
  }

  if (isCoordinatorMode) {
    return <CoordinatorApp onBack={() => { setIsCoordinatorMode(false); navigate('/'); }} />;
  }

  if (isParticipantMode) {
    return (
      <Routes>
        <Route path="/participant/dashboard" element={<ParticipantDashboard />} />
      </Routes>
    );
  }

  if (isAdminMode) {
    return <AdminDashboard onExitAdmin={handleExitAdmin} />;
  }

  return (
    <>
      <PublicSite onOpenLogin={() => setIsLoginOpen(true)} />
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}