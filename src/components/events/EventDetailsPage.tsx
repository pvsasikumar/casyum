import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  RefreshCw,
  Ticket,
  Users,
} from 'lucide-react';
import type { EventCmsData } from '../cms/types';
import { emptyCmsData, hasContent, sortSections } from '../cms/types';
import { loadEventCms } from '../cms/eventCmsService';
import { fetchEventBySlug, type PublicEvent } from '../../services/publicEventService';
import { DEFAULT_EVENT_IMAGE, isValidStoredImage } from '../../services/eventSlug';
import { useEventRegistration } from '../../hooks/useEventRegistration';
import { PublicEventRenderer } from './PublicEventRenderer';
import { ProfileCompletionModal } from './ProfileCompletionModal';
import { PaymentDetailsSection } from './PaymentDetailsSection';
import { SmartImage } from '../ui/SmartImage';

const skeletonBlock = 'animate-pulse rounded-2xl bg-white/[0.04]';

const statusStyles: Record<string, string> = {
  'Registration Open': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'Registration Closed': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Event Full': 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  Completed: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export const EventDetailsPage: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [cms, setCms] = useState<EventCmsData>(() => emptyCmsData(''));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    if (!eventSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const resolved = await fetchEventBySlug(eventSlug);
      if (!resolved) {
        setEvent(null);
        setLoading(false);
        return;
      }
      setEvent(resolved);
      const cmsData = await loadEventCms(resolved.eventId);
      setCms(cmsData);
    } catch {
      setLoadError('Unable to load event details. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [eventSlug]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void load();
  }, [load]);

  const {
    isChecking,
    isSigningIn,
    signInError,
    alreadyRegistered,
    isRegistering,
    showProfileModal,
    setShowProfileModal,
    showPaymentForm,
    cancelPaymentForm,
    profileSaving,
    profileError,
    registerMessage,
    registerError,
    uploadProgress,
    handleRegister,
    handleProfileComplete,
    doRegister,
  } = useEventRegistration(event?.eventId || '', event?.slug || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">
          <div className={`${skeletonBlock} h-10 w-40`} />
          <div className={`${skeletonBlock} h-72`} />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className={`${skeletonBlock} h-96`} />
            <div className={`${skeletonBlock} h-72`} />
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 px-6">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
          <RefreshCw className="w-10 h-10 text-rose-400" />
          <p className="text-white/60 text-sm">{loadError}</p>
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white pt-32 px-6">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-5">
          <MapPin className="w-10 h-10 text-white/30" />
          <h1 className="text-2xl font-extrabold font-display">Event Not Found</h1>
          <p className="text-white/50 text-sm">We couldn't find the event you're looking for.</p>
          <Link
            to="/#events"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const visibleSections = sortSections(cms.sections).filter((s) => s.isVisible && hasContent(s));
  const isComingSoon = visibleSections.length === 0;
  const isClosed = event.registrationStatus === 'Registration Closed' || event.registrationStatus === 'Completed';
  const isFull = event.registrationStatus === 'Event Full';

  const registerPanel = (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 flex flex-col gap-4 sticky top-24">
      <div className="flex items-center justify-between gap-3">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[event.registrationStatus] || statusStyles['Registration Open']}`}>
          {event.registrationStatus || 'Registration Open'}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">CASYUM</span>
      </div>

      <div className="flex flex-col gap-2 text-xs text-white/70">
        {event.date && (
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-violet-400" />
            {event.date}
          </span>
        )}
        {event.venue && (
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-400" />
            {event.venue}
          </span>
        )}
        {event.maxParticipants > 0 && (
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            {event.registeredCount} / {event.maxParticipants} registered
          </span>
        )}
      </div>

      <div className="h-px bg-white/10" />

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold">
          <Clock className="w-4 h-4" />
          {event.registrationStatus === 'Completed' ? 'Event Completed' : 'Registration Closed'}
        </div>
      ) : isFull ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-bold">
          <Users className="w-4 h-4" />
          Event Full
        </div>
      ) : alreadyRegistered ? (
        <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          You are already registered for this event.
        </div>
      ) : showPaymentForm ? (
        <PaymentDetailsSection
          eventName={event.name}
          fee={event.fee}
          isSubmitting={isRegistering}
          uploadProgress={uploadProgress}
          error={registerError}
          onCancel={cancelPaymentForm}
          onSubmit={(payment) => void doRegister(payment)}
        />
      ) : (
        <button
          onClick={() => void handleRegister()}
          disabled={isRegistering || isSigningIn || isChecking}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isRegistering || isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Ticket className="w-4 h-4" />
          )}
          {isSigningIn ? 'Signing in...' : isRegistering ? 'Registering...' : 'Register for Event'}
        </button>
      )}

      {registerMessage && (
        <p className="flex items-start gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {registerMessage}
        </p>
      )}
      {(registerError || signInError) && (
        <p className="text-xs text-rose-300">{registerError || signInError}</p>
      )}
    </div>
  );

  const heroImage = isValidStoredImage(event.heroImage) ? event.heroImage : event.cardImage || DEFAULT_EVENT_IMAGE;
  const heroFallback = event.cardImage && event.cardImage !== heroImage ? event.cardImage : DEFAULT_EVENT_IMAGE;
  const heroAlt = event.heroImageAlt || event.name;

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-20 px-6 selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <Link
          to="/#events"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All Events
        </Link>

        <div className="relative rounded-3xl overflow-hidden border border-white/10 aspect-video sm:aspect-[21/9]">
          <SmartImage
            src={heroImage}
            fallback={heroFallback}
            alt={heroAlt}
            className="w-full h-full"
            wrapperClassName="absolute inset-0"
            placeholder="Loading image…"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8 flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {event.category && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase tracking-wider">
                  {event.category}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[event.registrationStatus] || statusStyles['Registration Open']}`}>
                {event.registrationStatus || 'Registration Open'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight">{event.name}</h1>
            {event.tagline && <p className="text-sm sm:text-base text-violet-300/90 font-medium">{event.tagline}</p>}
            {event.shortDescription && !event.tagline && (
              <p className="text-sm text-white/70 leading-relaxed">{event.shortDescription}</p>
            )}
          </div>
        </div>

        {isComingSoon ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center rounded-3xl border border-white/10 bg-white/[0.02]">
            <Clock className="w-8 h-8 text-white/30" />
            <p className="text-white/60 text-sm">Event details are coming soon.</p>
            <p className="text-white/30 text-xs">Check back later for the full schedule, rules, and prizes.</p>
            {!isClosed && !isFull && registerPanel}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <PublicEventRenderer data={cms} />
            <div className="w-full lg:w-[320px]">{registerPanel}</div>
          </div>
        )}
      </div>

      {showProfileModal && (
        <ProfileCompletionModal
          saving={profileSaving}
          error={profileError}
          onClose={() => setShowProfileModal(false)}
          onSubmit={(data) => void handleProfileComplete(data)}
        />
      )}

      {registerMessage && !showProfileModal && (
        <Link
          to="/participant/dashboard"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold backdrop-blur-xl shadow-2xl hover:bg-emerald-500/25 transition-colors"
        >
          View your registrations
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
};

export default EventDetailsPage;
