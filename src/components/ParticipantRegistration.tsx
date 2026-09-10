import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { SplineScene } from '@/components/ui/splite';
import { REGISTRATION_FORM_URL } from '../config/registrationConfig';
import type { CmsRegisterContent } from '../services/cmsService';

export const ParticipantRegistration: React.FC<{
  content?: Partial<CmsRegisterContent>;
  /** CMS control for the registration panel (heading text stays editable). */
  showSignInPanel?: boolean;
}> = ({ content, showSignInPanel = true }) => {
  const kicker = content?.kicker || 'Secure Your Spot';
  const heading = content?.heading || 'Join the Symposium';
  const description =
    content?.description ||
    'Register for CASYUM 2K26 through the official Google Form. It opens in a new tab — no account needed.';

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

            {!showSignInPanel ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-bold mt-4 w-fit">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Registrations are currently closed. Please check back later.
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-4">
                <a
                  href={REGISTRATION_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full max-w-[360px] py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-violet-500/25 cursor-pointer active:scale-98"
                >
                  <ExternalLink className="w-4 h-4" />
                  Register Now
                </a>
                <span className="text-[10px] text-white/40">Opens the official Google Form in a new tab</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[9px] text-white/30 uppercase tracking-widest">Official Registration Form</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex flex-wrap gap-2">
              {['Open the Google Form', 'Fill in your details', 'Submit your registration'].map((step) => (
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