import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LayoutDashboard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { SplineScene } from '@/components/ui/splite';
import { api } from '../services/api';
import { useRBAC } from '../rbac/context/RBACContext';
import type { CmsRegisterContent } from '../services/cmsService';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: {
            type?: string;
            theme?: string;
            size?: string;
            text?: string;
            shape?: string;
            logo_alignment?: string;
            width?: number;
          }) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById('gsi-client') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In.')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In.'));
    document.head.appendChild(script);
  });
}

export const ParticipantRegistration: React.FC<{
  content?: Partial<CmsRegisterContent>;
  /** CMS control for the Google Sign-In panel (heading text stays editable). */
  showSignInPanel?: boolean;
}> = ({ content, showSignInPanel = true }) => {
  const navigate = useNavigate();
  const { login, role } = useRBAC();

  const kicker = content?.kicker || 'Secure Your Spot';
  const heading = content?.heading || 'Join the Symposium';
  const description =
    content?.description ||
    'Sign in with your Google account to register for CASYUM 2K26. Your account is created automatically on your first sign-in.';

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [authenticating, setAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const callbackRef = useRef<((response: { credential?: string }) => void) | null>(null);

  const isParticipant = role === 'Participant';

  callbackRef.current = async (response: { credential?: string }) => {
    const credential = response?.credential;
    if (!credential) {
      setErrorMsg('Google Sign-In was cancelled. Please try again.');
      return;
    }
    setAuthenticating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await api.googleLogin(credential);
      login({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: 'Participant',
        token: result.token,
        department: result.user.department,
        phone: result.user.phone,
        is_first_login: result.is_first_login,
      });
      setSuccessMsg(`Welcome, ${result.user.name}! Redirecting to your dashboard...`);
      setAuthenticating(false);
      navigate('/participant/sponsors', { replace: true });
    } catch (err) {
      setAuthenticating(false);
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In failed. Please try again.');
    }
  };

  useEffect(() => {
    let mounted = true;

    api
      .googleConfig()
      .then(async (config) => {
        if (!mounted) return;
        if (!config.clientId) {
          setStatus('error');
          setErrorMsg('Google Sign-In is not configured yet. Please try again later.');
          return;
        }
        await loadGoogleScript();
        if (!mounted || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response) => callbackRef.current?.(response),
          auto_select: false,
        });
        window.google.accounts.id.disableAutoSelect();
        setStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('error');
        setErrorMsg('Could not load Google Sign-In. Check your connection and try again.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || renderedRef.current || !buttonRef.current || !window.google?.accounts?.id) return;
    renderedRef.current = true;
    const width = Math.max(buttonRef.current.clientWidth || 320, 240);
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width,
    });
  }, [status]);

  return (
    <section id="register" className="relative py-24 px-6 select-none bg-black overflow-hidden flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />

      <Card className="max-w-5xl w-full mx-auto relative z-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <div className="flex flex-col-reverse md:flex-row h-full min-h-[500px]">
          <div className="flex-1 p-8 sm:p-12 relative z-10 flex flex-col justify-center gap-6">
            <span className="text-xs font-bold tracking-[0.3em] text-violet-400 uppercase text-left">{kicker}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-gradient text-left">{heading}</h2>
            <p className="text-white/50 text-sm leading-relaxed text-left">
              {description}
            </p>

            {isParticipant ? (
              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => navigate('/participant/dashboard', { replace: true })}
                  className="w-full py-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-violet-500/25 cursor-pointer active:scale-98"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to your Dashboard
                </button>
              </div>
            ) : !showSignInPanel ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold mt-4 w-fit">
                Registrations are currently closed. Please check back later.
              </div>
            ) : status === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-white/40 mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Google Sign-In...</span>
              </div>
            ) : status === 'error' ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mt-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <div ref={buttonRef} className="w-full max-w-[360px] [&>div]:w-full [&>div]:max-w-none" />
                {authenticating && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-xs text-violet-300"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating with Google...</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs"
                  >
                    <span>{successMsg}</span>
                  </motion.div>
                )}
                {errorMsg && status === 'ready' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9px] text-white/30 uppercase tracking-widest">Participants only</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex flex-wrap gap-2">
              {['Sign in once with Google', 'Complete your profile', 'Register for events'].map((step) => (
                <span key={step} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/50 font-medium">
                  {step}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[300px] md:min-h-full relative border-t md:border-t-0 md:border-l border-white/10 bg-zinc-950/50">
            <SplineScene scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" className="w-full h-full min-h-[350px] md:min-h-[500px]" />
          </div>
        </div>
      </Card>
    </section>
  );
};

export default ParticipantRegistration;
