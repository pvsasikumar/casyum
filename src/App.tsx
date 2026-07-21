import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IntroVideo } from './components/IntroVideo';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Events } from './components/Events';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { SplineScene } from '@/components/ui/splite';
import { AdminDashboard } from './admin/AdminDashboard';
import { LoginModal } from './components/LoginModal';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Admin mode toggle (URL param ?admin or session toggle)
  const [isAdminMode, setIsAdminMode] = useState(() => {
    return new URLSearchParams(window.location.search).has('admin');
  });

  // Check session storage, URL params, and reduced motion settings on mount
  const [showIntro, setShowIntro] = useState(() => {
    if (isAdminMode) return false;

    // 1. Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return false;

    // 2. Developer override check (/?intro forces replay)
    const forceIntro = new URLSearchParams(window.location.search).has('intro');
    if (forceIntro) return true;

    // 3. Normal session persistence play check
    const hasPlayed = sessionStorage.getItem('casyum_intro_played') === 'true';
    return !hasPlayed;
  });

  const [isVideoEnded, setIsVideoEnded] = useState(false);

  // Lock page scrolling when intro is active, and restore once unmounted
  useEffect(() => {
    if (showIntro) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showIntro]);

  const handleVideoEnded = () => {
    // 1. Immediately trigger the homepage staggered fade-ins (Hero text and Navbar)
    setIsVideoEnded(true);

    // 2. Cache that the intro was played in the session
    sessionStorage.setItem('casyum_intro_played', 'true');

    // 3. Immediately trigger the exit transition
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    sessionStorage.removeItem('casyum_intro_played');
    setIsVideoEnded(false);
    setShowIntro(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Content begins animating if the intro was skipped, or if the video has ended
  const startAnimation = !showIntro || isVideoEnded;

  // ─── ADMIN MODE ─────────────────────────────────────────
  if (isAdminMode) {
    return <AdminDashboard onExitAdmin={() => setIsAdminMode(false)} />;
  }

  // ─── PUBLIC SITE ────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      {/* Navbar - Fades and slides down together with the hero content */}
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

      {/* Intro Video Overlay - Handles playback and premium exit fade */}
      <AnimatePresence mode="wait">
        {showIntro && (
          <motion.div
            key="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: [1, 1, 0] }}
            transition={{
              duration: 0.7,
              times: [0, 0.4, 1],
              ease: 'easeOut',
            }}
            className="fixed inset-0 z-50 bg-black overflow-hidden"
          >
            <IntroVideo onVideoEnded={handleVideoEnded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Layout (fades in underneath, scrollable after intro completes) */}
      <div className="relative z-10">
        <Hero startAnimation={startAnimation} onOpenLogin={() => setIsLoginOpen(true)} />
        <About />
        <Events />

        {/* Registration Section */}
        <section id="register" className="relative py-24 px-6 select-none bg-black overflow-hidden flex items-center justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
          
          <Card className="max-w-5xl w-full mx-auto relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <Spotlight
              className="-top-40 left-0 md:left-60 md:-top-20"
              fill="white"
            />
            
            <div className="flex flex-col-reverse md:flex-row h-full min-h-[500px]">
              {/* Left content - Form */}
              <div className="flex-1 p-8 sm:p-12 relative z-10 flex flex-col justify-center gap-6">
                <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase text-left">Secure Your Spot</span>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-gradient text-left">Join the Symposium</h2>
                <p className="text-white/50 text-sm leading-relaxed text-left">
                  Enter your details below to register for CASYUM 2K26. The AI robot on the right is watching and assisting you live!
                </p>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4 mt-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Institution / University"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-3.5 mt-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg shadow-violet-500/20 active:scale-98 cursor-pointer"
                  >
                    Complete Registration
                  </button>
                </form>
              </div>

              {/* Right content - 3D Robot Scene */}
              <div className="flex-1 min-h-[300px] md:min-h-full relative border-t md:border-t-0 md:border-l border-white/10 bg-zinc-950/50">
                <SplineScene 
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full min-h-[350px] md:min-h-[500px]"
                />
              </div>
            </div>
          </Card>
        </section>

        {/* Footer with Replay Button & Admin Access */}
        <footer className="border-t border-white/5 bg-black/50 py-12 px-6 text-center text-[10px] tracking-[0.25em] text-white/30 uppercase font-semibold font-display">
          <div className="max-w-4xl mx-auto flex flex-col gap-6 items-center">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleReplayIntro}
                className="px-6 py-2.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-300 text-[10px] uppercase font-bold tracking-widest cursor-pointer active:scale-95"
              >
                Replay Intro Video
              </button>

              <button
                onClick={() => setIsAdminMode(true)}
                className="px-6 py-2.5 rounded-full border border-violet-500/30 text-violet-400 hover:text-violet-300 hover:border-violet-500/50 bg-violet-500/10 hover:bg-violet-500/20 transition-all duration-300 text-[10px] uppercase font-bold tracking-widest cursor-pointer active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>
            </div>

            <span>© 2026 CASYUM SYMPOSIUM. ALL RIGHTS RESERVED.</span>
            <span className="text-[9px] text-violet-400/40">SRM INSTITUTE OF SCIENCE AND TECHNOLOGY · DEPT OF COMPUTER APPLICATIONS</span>
          </div>
        </footer>
      </div>

      {/* Login Portal Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginAdmin={() => setIsAdminMode(true)}
      />
    </div>
  );
}
