import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LogOut,
  Loader2,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  UserRound,
  ChevronRight,
  ChevronDown,
  CircleCheckBig,
  CircleDollarSign,
  Lock,
  XCircle,
  RefreshCw,
  Gamepad2,
  Radio,
  Check,
  Ticket,
  Layers,
} from 'lucide-react';
import { useRBAC } from '../rbac/context/RBACContext';
import { api } from '../services/api';
import { EventOverviewCms } from '../components/cms/EventOverviewCms';
import { ParticipantQRCard } from './ParticipantQRCard';
import { PaymentDetailsSection } from '../components/events/PaymentDetailsSection';
import { RuleBookButton } from '../components/events/RuleBookButton';
import { fetchGlobalRuleBook, type GlobalRuleBookInfo } from '../services/ruleBookService';
import { TeamFormationSection } from './TeamFormationSection';
import {
  registerEvent,
  registerEventBundle,
  resubmitRegistrationPayment,
} from '../services/participantService';
import { readCommunicationSettings } from '../services/communicationSettingsService';
import {
  WhatsAppInviteModal,
  type RegistrationSuccessInfo,
} from './WhatsAppInviteModal';
import {
  isGamingEvent,
  calculateRegistrationFee,
  MAX_REGULAR_EVENTS,
  REGULAR_EVENT_FEE,
  GAMING_EVENT_FEE,
  findEventTimeClashes,
  eventTimeClashMessage,
  parseEventTimeRange,
  type EventSelectionLike,
} from '../services/eventSelection';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';

/**
 * Deduplicate registration records by their unique Firestore registration id
 * before any rendering. Guards against legacy duplicate documents or repeated
 * state updates while preserving distinct registrations (each registration
 * document stays exactly one record). Refresh/re-render can never append the
 * same registration twice.
 */
function dedupeRegistrations(regs: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const reg of regs || []) {
    if (!reg) continue;
    const key = reg.registration_id != null ? String(reg.registration_id) : '';
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    unique.push(reg);
  }
  return unique;
}

/**
 * Expand one registration record into its selected events so "My Registrations"
 * renders a single card per event (never one card per registration, which would
 * repeat the registration summary shown in the panel above). Falls back to the
 * stored event name for legacy single-event registrations.
 */
function registrationEventItems(reg: any): Array<{ eventId: string | null; eventName: string }> {
  const items: Array<{ eventId: string | null; eventName: string }> = [];
  const sel = reg?.selectedEvents;
  if (sel && Array.isArray(sel.regular)) {
    sel.regular.forEach((ev: any) => {
      if (ev && ev.eventName) {
        items.push({
          eventId: ev.eventId != null ? String(ev.eventId) : null,
          eventName: String(ev.eventName),
        });
      }
    });
  }
  if (sel && sel.gaming && sel.gaming.eventName) {
    items.push({
      eventId: sel.gaming.eventId != null ? String(sel.gaming.eventId) : null,
      eventName: String(sel.gaming.eventName),
    });
  }
  if (items.length === 0 && reg?.event_name) {
    items.push({
      eventId: reg.event_id != null ? String(reg.event_id) : null,
      eventName: String(reg.event_name),
    });
  }
  return items;
}

export const ParticipantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useRBAC();
  const pendingEventProcessedRef = useRef(false);

  const [participant, setParticipant] = useState<any>(null);
  const [openEvents, setOpenEvents] = useState<any[]>([]);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [globalRuleBook, setGlobalRuleBook] = useState<GlobalRuleBookInfo | null>(null);

  const [profile, setProfile] = useState({ phone: '', college: '', city: '', department: '', year_of_study: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<any>(null);
  const [resubmitTarget, setResubmitTarget] = useState<any>(null);
  const [resubmitError, setResubmitError] = useState('');
  const [resubmittingNow, setResubmittingNow] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<any>(null);
  const [registerError, setRegisterError] = useState('');
  const [registeringNow, setRegisteringNow] = useState(false);
  const [selectedRegularIds, setSelectedRegularIds] = useState<string[]>([]);
  const [selectedGamingId, setSelectedGamingId] = useState<string | null>(null);
  const [selectionNotice, setSelectionNotice] = useState('');
  const [confirmingEvent, setConfirmingEvent] = useState<{ type: 'regular' | 'gaming'; id: string } | null>(null);
  const [timingConflictNotice, setTimingConflictNotice] = useState(false);
  const [whatsAppInvite, setWhatsAppInvite] = useState<{
    settings: { groupName: string; description: string; inviteLink: string };
    registration: RegistrationSuccessInfo;
  } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [meRes, eventsRes] = await Promise.all([
        api.participant.me(),
        api.event.list(),
      ]);
      setParticipant(meRes.participant);
      const all = eventsRes.events || [];
      setAllEvents(all);
      setOpenEvents(all.filter((e: any) => e.status === 'Open'));
      if (meRes.participant?.profile_completed === 1) {
        setProfile({
          phone: meRes.participant.phone || '',
          college: meRes.participant.college || '',
          city: meRes.participant.city || '',
          department: meRes.participant.department || '',
          year_of_study: meRes.participant.year_of_study || '',
        });
      }
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /**
   * Handles a deep link from the public event details page:
   * `/participant/dashboard?event=<id>&select=1` pre-selects the clicked event
   * (added to the current selection) WITHOUT opening the payment flow, so the
   * participant can review their selection and choose additional events first;
   * `&status=already_registered` surfaces the existing registration status
   * instead of creating a duplicate.
   */
  useEffect(() => {
    if (loading || !participant || pendingEventProcessedRef.current) return;
    const eventIdParam = searchParams.get('event');
    if (!eventIdParam) {
      pendingEventProcessedRef.current = true;
      return;
    }
    if (participant.profile_completed !== 1) return;
    if (openEvents.length === 0) return;

    const already = (participant.event_ids || []).some(
      (x: any) => Number(x) === Number(eventIdParam)
    );
    const wantsSelect = searchParams.get('select') === '1';
    const wantsAlreadyNotice = searchParams.get('status') === 'already_registered';
    const hasSubmitted = dedupeRegistrations(participant.registered_events).length > 0;

    pendingEventProcessedRef.current = true;
    setSearchParams({}, { replace: true });

    if (hasSubmitted) {
      setNotice('You have already submitted your registration for CASYUM. Duplicate registrations are not allowed.');
      return;
    }

    if (already || wantsAlreadyNotice) {
      setNotice('You are already registered for this event.');
      return;
    }

    const ev = openEvents.find((e) => String(e.id) === String(eventIdParam));
    if (!ev) {
      setNotice('The selected event is not available for registration right now.');
      return;
    }
    if (Number(ev.max_participants) > 0 && Number(ev.registered_count) >= Number(ev.max_participants)) {
      setNotice('This event has reached its maximum capacity.');
      return;
    }

    if (wantsSelect) {
      setSelectionNotice('');
      if (isGamingEvent(ev)) {
        setSelectedGamingId(String(ev.id));
        setNotice(`${ev.name} added to your selection. Choose your events, review the amount, then click Proceed to Payment.`);
      } else {
        setSelectedRegularIds((prev) => {
          if (prev.includes(String(ev.id))) return prev;
          if (prev.length >= MAX_REGULAR_EVENTS) {
            setNotice(`You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`);
            return prev;
          }
          return [...prev, String(ev.id)];
        });
        setNotice(`${ev.name} added to your selection. Choose your events, review the amount, then click Proceed to Payment.`);
      }
    }
  }, [loading, participant, openEvents, searchParams, setSearchParams]);

  /**
   * Resolve the current selection to event objects and derive the fee through
   * the shared `calculateRegistrationFee` utility. Memoized so the amount
   * always reflects the latest selection (select/remove/gaming switch) and is
   * never calculated from stale state or a stale stored value.
   */
  const selectedEvents = useMemo<EventSelectionLike[]>(() => {
    const ids = [...selectedRegularIds, ...(selectedGamingId ? [selectedGamingId] : [])];
    return ids
      .map((id) => openEvents.find((e) => String(e.id) === id))
      .filter((e): e is EventSelectionLike => Boolean(e));
  }, [selectedRegularIds, selectedGamingId, openEvents]);

  const feeBreakdown = useMemo(() => {
    const breakdown = calculateRegistrationFee(selectedEvents);
    if (selectedEvents.length > 0 && breakdown.total === 0) {
      console.error(
        '[CASYUM Payment] Events are selected but the computed fee is 0. Inspect the event category/type data:',
        selectedEvents.map((e) => ({
          id: e.id ?? e.eventId,
          name: e.name ?? e.eventName,
          category: e.category,
          type: e.type,
          event_type: e.event_type,
          is_gaming: e.is_gaming,
        }))
      );
    }
    return breakdown;
  }, [selectedEvents]);

  /**
   * Scheduling conflicts among the currently selected events. Advisory only —
   * the participant is still allowed to register, but is shown which events
   * overlap so they can adjust the selection before paying.
   */
  const timeClashes = useMemo(() => findEventTimeClashes(selectedEvents), [selectedEvents]);

  /**
   * Global CASYUM Rule Book — the SAME PDF is shown for every event.
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const g = await fetchGlobalRuleBook();
        if (alive) setGlobalRuleBook(g);
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, []);

  const handleLogout = () => {
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

  const validateProfile = (): boolean => {
    const errors: Record<string, string> = {};
    if (!profile.phone.trim()) errors.phone = 'Phone number is required.';
    if (!profile.college.trim()) errors.college = 'College name is required.';
    if (!profile.city.trim()) errors.city = 'City is required.';
    else if (!/^[A-Za-z\s'-]{2,100}$/.test(profile.city.trim())) errors.city = 'Please enter a valid city name.';
    if (!profile.department.trim()) errors.department = 'Department is required.';
    if (!profile.year_of_study) errors.year_of_study = 'Year of study is required.';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      await api.participant.completeProfile({
        phone: profile.phone.trim(),
        college: profile.college.trim(),
        city: profile.city.trim(),
        department: profile.department.trim(),
        year_of_study: profile.year_of_study,
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const regularLimit = selectedGamingId ? 1 : MAX_REGULAR_EVENTS;
  const gamingBlocked = selectedRegularIds.length >= MAX_REGULAR_EVENTS;

  const doesEventOverlap = (candidate: any, existing: any): boolean => {
    const dateA = String(candidate.event_date || candidate.date || '').trim();
    const dateB = String(existing.event_date || existing.date || '').trim();
    if (dateA && dateB && dateA !== dateB) return false;
    if (dateA && !dateB) return false;
    if (!dateA && dateB) return false;
    const rangeA = parseEventTimeRange(String(candidate.time || ''));
    const rangeB = parseEventTimeRange(String(existing.time || ''));
    if (!rangeA || !rangeB) return false;
    return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
  };

  const hasTimingConflict = (eventId: string | number): boolean => {
    const id = String(eventId);
    const candidate = openEvents.find((e) => String(e.id) === id);
    if (!candidate) return false;
    const existingIds = [...selectedRegularIds, ...(selectedGamingId ? [selectedGamingId] : [])];
    for (const existingId of existingIds) {
      const existing = openEvents.find((e) => String(e.id) === String(existingId));
      if (existing && doesEventOverlap(candidate, existing)) return true;
    }
    return false;
  };

  const toggleRegularEvent = (eventId: string | number) => {
    setError('');
    setNotice('');
    setSelectionNotice('');
    const id = String(eventId);
    if (selectedRegularIds.includes(id)) {
      setSelectedRegularIds((prev) => prev.filter((x) => x !== id));
      return;
    }
    if (selectedRegularIds.length >= regularLimit) {
      setSelectionNotice(
        selectedGamingId
          ? 'A gaming event can be combined with only one regular event.'
          : `You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`
      );
      return;
    }
    setSelectedRegularIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const toggleGamingEvent = (eventId: string | number) => {
    setError('');
    setNotice('');
    setSelectionNotice('');
    const id = String(eventId);
    if (selectedGamingId && selectedGamingId !== id) {
      setSelectionNotice('You can participate in only one gaming event.');
      return;
    }
    if (selectedRegularIds.length >= MAX_REGULAR_EVENTS) {
      setSelectionNotice('Two regular events cannot be combined with a gaming event.');
      return;
    }
    setSelectedGamingId((prev) => (prev === id ? null : id));
  };

  const handleBundleProceed = () => {
    setError('');
    setNotice('');
    setSelectionNotice('');
    const regularCount = selectedRegularIds.length;
    const gamingCount = selectedGamingId ? 1 : 0;
    if (regularCount === 0 && gamingCount === 0) {
      setSelectionNotice('Select at least one event to continue.');
      return;
    }
    if (gamingCount === 1 && regularCount >= MAX_REGULAR_EVENTS) {
      setSelectionNotice('Two regular events cannot be combined with a gaming event.');
      return;
    }
    setRegisterError('');
    setRegisterTarget({
      bundle: true,
      fee: feeBreakdown.total,
      regularFee: feeBreakdown.regularFee,
      gamingFee: feeBreakdown.gamingFee,
    });
  };

  /**
   * Fetches the admin-managed communication settings and, if the WhatsApp
   * group invitation is enabled, opens the success popup with the freshly
   * fetched invite link. Runs exactly once per registration submission —
   * never on login, refresh or profile update.
   */
  const openWhatsAppInvite = async (registration: RegistrationSuccessInfo) => {
    try {
      const settings = await readCommunicationSettings();
      const whatsapp = settings?.whatsapp;
      if (whatsapp?.enabled && whatsapp.inviteLink) {
        setWhatsAppInvite({
          settings: {
            groupName: whatsapp.groupName,
            description: whatsapp.description,
            inviteLink: whatsapp.inviteLink,
          },
          registration,
        });
      }
    } catch {
      // Never block the participant if the popup settings cannot be loaded.
    }
  };

  const handleBundleSubmit = async (payment: { payment_method: string; transaction_id: string; payment_date: string; payment_screenshot_url?: string; payment_screenshot_file_id?: string }) => {
    if (!registerTarget?.bundle) return;
    setError('');
    setNotice('');
    setRegisteringNow(true);
    setRegisterError('');
    try {
      const res = await registerEventBundle(
        {
          regularEventIds: selectedRegularIds,
          gamingEventId: selectedGamingId,
        },
        {
          payment_method: payment.payment_method,
          transaction_id: payment.transaction_id,
          payment_date: payment.payment_date,
          payment_screenshot_url: payment.payment_screenshot_url,
          payment_screenshot_file_id: payment.payment_screenshot_file_id,
        }
      );
      setNotice(res.message);
      setRegisterTarget(null);
      setSelectedRegularIds([]);
      setSelectedGamingId(null);
      await loadAll();
      await openWhatsAppInvite({
        registrationId: res.registrationId,
        events: [
          ...res.regular.map((r) => r.eventName),
          ...(res.gaming ? [res.gaming.eventName] : []),
        ],
        amount: res.fee,
        paymentStatus: 'Pending Faculty Verification',
      });
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Failed to register for the selected events.');
    } finally {
      setRegisteringNow(false);
    }
  };

  const handleRegisterSubmit = async (payment: { payment_method: string; transaction_id: string; payment_date: string; payment_screenshot_url?: string; payment_screenshot_file_id?: string }) => {
    if (!registerTarget || registerTarget.bundle) return;
    setError('');
    setNotice('');
    setRegisteringNow(true);
    setRegisterError('');
    try {
      const res = await registerEvent(registerTarget.id, {
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        payment_date: payment.payment_date,
        payment_screenshot_url: payment.payment_screenshot_url,
        payment_screenshot_file_id: payment.payment_screenshot_file_id,
      });
      setNotice(res.message);
      setRegisterTarget(null);
      await loadAll();
      await openWhatsAppInvite({
        registrationId: res.registrationId,
        events: [res.event.name],
        amount: Number(registerTarget.fee) || 0,
        paymentStatus: 'Pending Faculty Verification',
      });
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Failed to register for the event.');
    } finally {
      setRegisteringNow(false);
    }
  };

  const handleResubmit = async (payment: { payment_method: string; transaction_id: string; payment_date: string; payment_screenshot_url?: string; payment_screenshot_file_id?: string }) => {
    if (!resubmitTarget) return;
    setError('');
    setNotice('');
    setResubmittingNow(true);
    setResubmitError('');
    try {
      const res = await resubmitRegistrationPayment(resubmitTarget.registration_id, {
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        payment_date: payment.payment_date,
        payment_screenshot_url: payment.payment_screenshot_url,
        payment_screenshot_file_id: payment.payment_screenshot_file_id,
      });
      setNotice(res.message);
      setResubmitTarget(null);
      await loadAll();
    } catch (err) {
      setResubmitError(err instanceof Error ? err.message : 'Failed to resubmit payment.');
    } finally {
      setResubmittingNow(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-4">
          <AlertCircle className="w-10 h-10 text-rose-400" />
          <p className="text-white/60 text-sm max-w-sm">{error || 'Unable to load your account. Please sign in again.'}</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors cursor-pointer"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  const profileComplete = participant.profile_completed === 1;
  const registeredEventIds = new Set((participant.event_ids || []).map((x: any) => Number(x)));
  const myRegistrations = dedupeRegistrations(participant.registered_events);
  const hasSubmitted = myRegistrations.length > 0;
  const avatar = participant.profile_picture || '';

  const regularEvents = openEvents.filter((ev) => !isGamingEvent(ev));
  const gamingEvents = openEvents.filter((ev) => isGamingEvent(ev));
  const selectedGamingEvent = selectedGamingId
    ? openEvents.find((e) => String(e.id) === selectedGamingId) || null
    : null;
  const selectedRegularNames = selectedRegularIds
    .map((id) => openEvents.find((e) => String(e.id) === id)?.name || '')
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <div className="w-full h-full bg-black rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight font-display">
                CASYUM <span className="text-violet-400">Participant</span>
              </span>
              <span className="text-[9px] text-white/40 uppercase tracking-widest">Dashboard</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold">{participant.full_name}</span>
              <span className="text-[10px] text-white/40">{participant.email}</span>
            </div>
            {avatar ? (
              <img src={avatar} alt={participant.full_name} className="w-10 h-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <UserRound className="w-5 h-5 text-violet-300" />
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/25 hover:bg-white/10 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">
        {(error || notice) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs border ${
              error
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}
          >
            {error ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
            <span>{error || notice}</span>
          </motion.div>
        )}

        {!profileComplete ? (
          <ProfileCompletionForm
            profile={profile}
            setProfile={setProfile}
            errors={profileErrors}
            setErrors={setProfileErrors}
            saving={savingProfile}
            onSubmit={handleProfileSubmit}
            fullName={participant.full_name}
          />
        ) : (
          <>
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">CASYUM 2K26</span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
                    Active <span className="text-gradient">Events</span>
                  </h1>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CircleCheckBig className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Profile Completed</span>
                </div>
              </div>

              <ParticipantQRCard
                participantId={participant.participant_id || participant.id}
                casyumId={participant.casyum_id}
                registrationId={myRegistrations[0]?.registration_id}
                participantName={participant.full_name}
                paymentStatus={myRegistrations[0]?.payment_status}
                verificationStatus={participant.verificationStatus || 'Pending'}
                verifiedBy={participant.verifiedBy}
                verifiedAt={participant.verifiedAt}
                devSelfCheck={import.meta.env.DEV && searchParams.get('qrdiag') === '1'}
              />

              {hasSubmitted ? (
                <RegistrationSubmittedPanel registration={myRegistrations[0]} />
              ) : openEvents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40 text-sm">
                  No events are currently open for registration.
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {/* REGULAR CASYUM EVENTS */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <h2 className="text-sm font-extrabold tracking-tight font-display uppercase">Regular CASYUM Events</h2>
                          <span className="text-[10px] text-white/40">Select up to {MAX_REGULAR_EVENTS} regular events — ₹{REGULAR_EVENT_FEE}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                        selectedRegularIds.length === 0
                          ? 'bg-white/5 border-white/10 text-white/40'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        {selectedRegularIds.length}/{MAX_REGULAR_EVENTS} selected
                      </span>
                    </div>

                    {selectedRegularIds.length >= regularLimit && regularLimit > 0 && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          {selectedGamingId
                            ? 'A gaming event can be combined with only one regular event.'
                            : `You can select a maximum of ${MAX_REGULAR_EVENTS} regular events.`}
                        </span>
                      </div>
                    )}

                    {regularEvents.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40 text-sm">
                        No regular events are currently open for registration.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regularEvents.map((ev) => {
                          const id = String(ev.id);
                          const isFull = Number(ev.registered_count) >= Number(ev.max_participants);
                          const isRegistered = registeredEventIds.has(Number(ev.id));
                          const isSelected = selectedRegularIds.includes(id);
                          const atRegularLimit = selectedRegularIds.length >= regularLimit;
                          const selectable = !isRegistered && !isFull && (isSelected || !atRegularLimit);
                          return (
                            <div
                              key={ev.id}
                              className={`flex flex-col gap-4 rounded-2xl border p-5 transition-all ${
                                isSelected
                                  ? 'border-violet-500/60 bg-violet-500/[0.07] shadow-[0_0_20px_rgba(139,92,246,0.12)]'
                                  : 'border-white/10 bg-white/[0.03] hover:border-violet-500/40'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">{ev.category}</span>
                                  <h3 className="text-base font-bold tracking-tight truncate">{ev.name}</h3>
                                </div>
                                {isSelected && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-200 text-[9px] font-bold uppercase tracking-widest flex-shrink-0">
                                    <Check className="w-3 h-3" />
                                    Selected
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1.5 text-[11px] text-white/50">
                                <span className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-white/30" />
                                  {ev.event_date}
                                </span>
                                <span className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-white/30" />
                                  {ev.time || 'All day'}
                                </span>
                                <span className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-white/30" />
                                  {ev.venue || 'TBA'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-white/40">
                                <span className="flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  {Number(ev.registered_count)}/{Number(ev.max_participants)} registered
                                </span>
                                {isFull && <span className="text-rose-400 font-bold uppercase">Full</span>}
                              </div>

                              <button
                                onClick={() => setViewingEvent(viewingEvent?.id === ev.id ? null : ev)}
                                className="w-full py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer border bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/25 flex items-center justify-center gap-2"
                              >
                                {viewingEvent?.id === ev.id ? (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Hide Details
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3.5 h-3.5" />
                                    View Details
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  if (isRegistered || isFull) return;
                                  if (isSelected) {
                                    toggleRegularEvent(id);
                                    return;
                                  }
                                  setConfirmingEvent({ type: 'regular', id });
                                }}
                                disabled={!selectable}
                                className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                                  isRegistered
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                                    : isSelected
                                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                                      : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20'
                                } ${!selectable ? 'opacity-50' : ''}`}
                              >
                                {isRegistered ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Registered
                                  </>
                                ) : isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Remove Selection
                                  </>
                                ) : (
                                  <>
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    Select Event
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SPECIAL GAMING EVENT */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                          <Gamepad2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <h2 className="text-sm font-extrabold tracking-tight font-display uppercase">Special Gaming Event</h2>
                          <span className="text-[10px] text-white/40">Select only one gaming event — ₹{GAMING_EVENT_FEE}</span>
                        </div>
                      </div>
                      {selectedGamingEvent && (
                        <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border bg-rose-500/10 border-rose-500/30 text-rose-300">
                          {selectedGamingEvent.name} selected
                        </span>
                      )}
                    </div>

                    {selectedGamingEvent && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>You can participate in only one gaming event.</span>
                      </div>
                    )}

                    {gamingBlocked && !selectedGamingEvent && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>Two regular events cannot be combined with a gaming event.</span>
                      </div>
                    )}

                    {gamingEvents.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40 text-sm">
                        No gaming events are currently open for registration.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {gamingEvents.map((ev) => {
                          const id = String(ev.id);
                          const isFull = Number(ev.registered_count) >= Number(ev.max_participants);
                          const isRegistered = registeredEventIds.has(Number(ev.id));
                          const isSelected = selectedGamingId === id;
                          const selectable = !isRegistered && !isFull && (isSelected || !selectedGamingId) && !gamingBlocked;
                          return (
                            <div
                              key={ev.id}
                              onClick={() => {
                                if (!selectable) return;
                                if (isSelected) {
                                  toggleGamingEvent(id);
                                  return;
                                }
                                setConfirmingEvent({ type: 'gaming', id });
                              }}
                              className={`flex items-center gap-4 rounded-2xl border p-5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-rose-500/60 bg-rose-500/[0.07] shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                                  : 'border-white/10 bg-white/[0.03] hover:border-rose-500/40'
                              } ${!selectable ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              <span
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'border-rose-400' : 'border-white/25'
                                }`}
                              >
                                {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />}
                              </span>
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400/80 flex items-center gap-1">
                                  <Radio className="w-3 h-3" />
                                  Gaming
                                </span>
                                <h3 className="text-base font-bold tracking-tight truncate">{ev.name}</h3>
                                <span className="text-[10px] text-white/40">
                                  {Number(ev.registered_count)}/{Number(ev.max_participants)} registered
                                  {isFull ? ' · Full' : ''}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="flex items-center gap-1 text-rose-300 font-bold text-sm">
                                  <CircleDollarSign className="w-4 h-4" />
                                  ₹{GAMING_EVENT_FEE}
                                </span>
                                {isRegistered && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase tracking-widest">
                                    Registered
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selection summary */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Selected Events</span>
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        {selectedRegularNames.length === 0 && !selectedGamingEvent && (
                          <span className="text-white/30">Nothing selected yet.</span>
                        )}
                        {selectedRegularNames.map((name) => (
                          <span key={name} className="px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/25 text-violet-300">
                            {name}
                          </span>
                        ))}
                        {selectedGamingEvent && (
                          <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300">
                            {selectedGamingEvent.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Regular Events</span>
                        <span className={`text-xs font-extrabold ${selectedRegularIds.length > 0 ? 'text-violet-300' : 'text-white/40'}`}>
                          {selectedRegularIds.length}/{MAX_REGULAR_EVENTS} Selected
                        </span>
                      </div>
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Gaming Event</span>
                        <span className={`text-xs font-extrabold ${selectedGamingEvent ? 'text-rose-300' : 'text-white/40'}`}>
                          {selectedGamingEvent ? 1 : 0}/1 Selected
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Payment Summary</span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/60">Regular Fee</span>
                        <span className="text-emerald-300 font-bold">₹{feeBreakdown.regularFee}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white/60">Gaming Fee</span>
                        <span className="text-emerald-300 font-bold">₹{feeBreakdown.gamingFee}</span>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-white">Total Amount</span>
                        <span className="font-extrabold font-display text-gradient">₹{feeBreakdown.total}</span>
                      </div>
                    </div>

                    {timeClashes.length > 0 && (
                      <div className="flex flex-col gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span className="font-bold uppercase tracking-widest text-[10px]">Scheduling conflict detected</span>
                        </div>
                        <ul className="flex flex-col gap-1 pl-5 list-disc">
                          {timeClashes.map((clash, idx) => (
                            <li key={idx}>{eventTimeClashMessage(clash)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(selectionNotice || feeBreakdown.total === 0) && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{selectionNotice || 'Select at least one event to continue.'}</span>
                      </div>
                    )}
                    {feeBreakdown.total > 0 ? (
                      <button
                        onClick={handleBundleProceed}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Ticket className="w-4 h-4" />
                        Proceed to Payment — ₹{feeBreakdown.total}
                      </button>
                    ) : (
                      <p className="w-full py-3.5 rounded-xl border border-dashed border-white/15 text-center text-[10px] font-bold uppercase tracking-widest text-white/30">
                        Select events above to enable payment
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {viewingEvent && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-extrabold tracking-tight font-display">
                    <span className="text-gradient">{viewingEvent.name}</span> · Event Details
                  </h2>
                  <button
                    onClick={() => setViewingEvent(null)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/25 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <EventOverviewCms eventId={String(viewingEvent.id)} canEdit={false} />
              </section>
            )}

            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold tracking-tight font-display">
                My <span className="text-gradient">Registrations</span>
              </h2>
              {myRegistrations.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/40 text-sm">
                  You have not registered for any events yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {myRegistrations.map((reg: any) => {
                    const events = registrationEventItems(reg);
                    const singleEvent = events.length === 1;
                    return events.map((ev) => {
                      const evDetail = ev.eventId
                        ? openEvents.find((e) => String(e.id) === ev.eventId)
                        : undefined;
                      const ruleBook = globalRuleBook?.url
                        ? { url: globalRuleBook.url, fileName: globalRuleBook.fileName || '', version: globalRuleBook.version || '' }
                        : undefined;
                      return (
                        <MyRegistrationEventCard
                          key={`${reg.registration_id || 'registration'}::${ev.eventId || ev.eventName}`}
                          registration={reg}
                          eventName={ev.eventName}
                          eventDate={evDetail?.event_date || (singleEvent ? reg.event_date : '')}
                          eventTime={evDetail?.time || (singleEvent ? reg.event_time : '')}
                          venue={evDetail?.venue || (singleEvent ? reg.venue : '')}
                          ruleBookUrl={ruleBook?.url}
                          ruleBookFileName={ruleBook?.fileName}
                          ruleBookVersion={ruleBook?.version}
                          onResubmit={() => {
                            setResubmitError('');
                            setResubmitTarget(reg);
                          }}
                        />
                      );
                    });
                  })}
                </div>
              )}
            </section>

            <TeamFormationSection
              participantId={participant.participant_id || participant.id}
              events={allEvents}
              registrations={myRegistrations}
            />
          </>
        )}
      </main>

      {resubmitTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-[calc(100vw-24px)] md:w-[min(92vw,900px)] max-w-full max-h-[92vh] overflow-y-auto my-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Resubmit Payment</span>
                <h3 className="text-base font-bold font-display text-white">{resubmitTarget.event_name}</h3>
              </div>
              <button
                onClick={() => setResubmitTarget(null)}
                disabled={resubmittingNow}
                className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <PaymentDetailsSection
              eventName={resubmitTarget.event_name}
              fee={Number(resubmitTarget.fee) || 0}
              isSubmitting={resubmittingNow}
              error={resubmitError}
              onCancel={() => setResubmitTarget(null)}
              onSubmit={(payment) => void handleResubmit(payment)}
            />
          </div>
        </div>
      )}

      {registerTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-[calc(100vw-24px)] md:w-[min(92vw,900px)] max-w-full max-h-[92vh] overflow-y-auto my-auto flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">
                  {registerTarget.bundle ? 'Register for Selected Events' : 'Register for Event'}
                </span>
                <h3 className="text-base font-bold font-display text-white">
                  {registerTarget.bundle ? 'Your Selection' : registerTarget.name}
                </h3>
                {registerTarget.bundle && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedRegularNames.map((name) => (
                      <span key={name} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[9px] font-bold">
                        {name}
                      </span>
                    ))}
                    {selectedGamingEvent && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[9px] font-bold">
                        {selectedGamingEvent.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setRegisterTarget(null)}
                disabled={registeringNow}
                className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <PaymentDetailsSection
              eventName={registerTarget.bundle ? 'Your Selection' : registerTarget.name}
              fee={Number(registerTarget.fee) || 0}
              regularFee={registerTarget.bundle ? feeBreakdown.regularFee : undefined}
              gamingFee={registerTarget.bundle ? feeBreakdown.gamingFee : undefined}
              selectedEvents={
                registerTarget.bundle
                  ? selectedEvents
                  : registerTarget.event
                    ? [registerTarget.event]
                    : undefined
              }
              isSubmitting={registeringNow}
              error={registerError}
              onCancel={() => setRegisterTarget(null)}
              onSubmit={(payment) =>
                registerTarget.bundle ? void handleBundleSubmit(payment) : void handleRegisterSubmit(payment)
              }
            />
          </div>
        </div>
      )}

      {whatsAppInvite && (
        <WhatsAppInviteModal
          open
          settings={whatsAppInvite.settings}
          registration={whatsAppInvite.registration}
          onContinue={() => setWhatsAppInvite(null)}
        />
      )}

      {confirmingEvent && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[min(92vw,420px)] max-w-full rounded-2xl border border-white/10 bg-[#0b0b14] shadow-2xl shadow-violet-500/10 my-auto flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold tracking-tight font-display text-white">
                ⚠️ Important Notice
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Please check the event timings carefully and ensure that they do not clash with any other events you have registered for.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <button
                onClick={() => setConfirmingEvent(null)}
                className="py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/25 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const target = confirmingEvent;
                  setConfirmingEvent(null);
                  if (target && hasTimingConflict(target.id)) {
                    setTimingConflictNotice(true);
                    return;
                  }
                  if (target.type === 'regular') {
                    toggleRegularEvent(target.id);
                  } else {
                    toggleGamingEvent(target.id);
                  }
                }}
                className="py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-violet-500/20"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {timingConflictNotice && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[min(92vw,420px)] max-w-full rounded-2xl border border-white/10 bg-[#0b0b14] shadow-2xl shadow-rose-500/10 my-auto flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 px-6 pt-6 text-center">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold tracking-tight font-display text-white">
                Timing Conflict
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">
                This event overlaps with another event you have already selected. Please choose an event with a different timing.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <button
                onClick={() => setTimingConflictNotice(false)}
                className="py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:border-white/25 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RegistrationStatusTrackerProps {
  paymentStatus: string;
  deskVerified: boolean;
  attendanceEnabled: boolean;
  attendanceStatus: string;
}

const RegistrationStatusTracker: React.FC<RegistrationStatusTrackerProps> = ({
  paymentStatus,
  deskVerified,
  attendanceEnabled,
  attendanceStatus,
}) => {
  const attendanceMarked = !!attendanceStatus && attendanceStatus !== 'not_marked';
  const steps = [
    { label: 'Registration Submitted', state: 'done' as const },
    {
      label: paymentStatus === 'verified' ? 'Payment Verified' : paymentStatus === 'rejected' ? 'Payment Rejected' : 'Payment Verification Pending',
      state: (paymentStatus === 'verified' ? 'done' : paymentStatus === 'rejected' ? 'rejected' : 'pending') as 'done' | 'pending' | 'rejected' | 'locked',
    },
    {
      label: deskVerified ? 'Registration Desk Verified' : 'Registration Desk Verification Locked',
      state: (deskVerified ? 'done' : 'locked') as 'done' | 'pending' | 'rejected' | 'locked',
    },
    {
      label: attendanceEnabled ? 'Attendance Eligible' : 'Attendance Eligibility Locked',
      state: (attendanceEnabled ? 'done' : 'locked') as 'done' | 'pending' | 'rejected' | 'locked',
    },
    {
      label: attendanceMarked ? `Attendance Marked (${attendanceStatus})` : attendanceEnabled ? 'Attendance Not Yet Marked' : 'Attendance Not Marked',
      state: (attendanceMarked ? 'done' : attendanceEnabled ? 'pending' : 'locked') as 'done' | 'pending' | 'rejected' | 'locked',
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.label} className="flex items-start gap-2.5">
            <div className="flex flex-col items-center">
              {step.state === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : step.state === 'rejected' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : step.state === 'pending' ? (
                <Clock className="w-4 h-4 text-amber-400" />
              ) : (
                <Lock className="w-4 h-4 text-white/30" />
              )}
              {!isLast && <div className="w-px flex-1 min-h-4 bg-white/10 mt-1" />}
            </div>
            <span
              className={`text-[11px] pb-1.5 ${
                step.state === 'done'
                  ? 'text-emerald-300'
                  : step.state === 'rejected'
                    ? 'text-rose-300'
                    : step.state === 'pending'
                      ? 'text-amber-300'
                      : 'text-white/40'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface MyRegistrationEventCardProps {
  registration: any;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ruleBookUrl?: string;
  ruleBookFileName?: string;
  ruleBookVersion?: string;
  onResubmit: () => void;
}

/**
 * Event-wise registration card shown under "My Registrations". Each card
 * represents ONE selected event of a single registration record (records are
 * deduplicated by registration id), and keeps the existing event-wise
 * status/timeline. The registration-level summary (id, fee, payment status)
 * lives in the Registration Submitted panel above, so it is never repeated
 * here.
 */
const MyRegistrationEventCard: React.FC<MyRegistrationEventCardProps> = ({
  registration,
  eventName,
  eventDate,
  eventTime,
  venue,
  ruleBookUrl,
  ruleBookFileName,
  ruleBookVersion,
  onResubmit,
}) => {
  const paymentStatus = registration?.payment_status || 'submitted';
  const isRejected = paymentStatus === 'rejected';
  const deskVerified = (registration?.registration_verification_status || 'locked') === 'verified';
  const attendanceEnabled = registration?.attendance_eligibility === true;
  const attendanceStatus = registration?.attendance_status || 'not_marked';
  const scheduleLine = [eventDate, eventTime, venue].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-bold">{eventName}</span>
          {scheduleLine && <span className="text-[11px] text-white/40">{scheduleLine}</span>}
        </div>
        <RuleBookButton
          url={ruleBookUrl}
          fileName={ruleBookFileName}
          version={ruleBookVersion}
          variant="secondary"
          label="Rule Book"
        />
      </div>

      <RegistrationStatusTracker
        paymentStatus={paymentStatus}
        deskVerified={deskVerified}
        attendanceEnabled={attendanceEnabled}
        attendanceStatus={attendanceStatus}
      />

      {isRejected && (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Payment rejected: {registration.payment_rejection_reason || 'Please verify your payment details.'}
              {registration.payment_resubmission_count > 0
                ? ` (Resubmission #${registration.payment_resubmission_count})`
                : ''}
            </span>
          </div>
          <button
            onClick={onResubmit}
            className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Resubmit Payment
          </button>
        </div>
      )}
    </div>
  );
};

interface StatusItemProps {
  label: string;
  value: string;
  state: 'done' | 'pending' | 'rejected' | 'info';
}

const statusItemIcon = (state: StatusItemProps['state']) =>
  state === 'done' ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  ) : state === 'rejected' ? (
    <XCircle className="w-4 h-4 text-rose-400" />
  ) : state === 'pending' ? (
    <Clock className="w-4 h-4 text-amber-400" />
  ) : (
    <AlertCircle className="w-4 h-4 text-violet-400" />
  );

/**
 * Read-only summary shown after a participant has submitted their single
 * registration for CASYUM. The event selection and payment flow are hidden and
 * the dashboard only reports the stored registration state. All data comes from
 * the registration document — nothing here can create a second registration.
 */
const RegistrationSubmittedPanel: React.FC<{ registration: any }> = ({ registration }) => {
  const paymentStatus = registration?.payment_status || 'submitted';
  const paymentVerified = paymentStatus === 'verified';
  const paymentRejected = paymentStatus === 'rejected';
  const deskVerified = (registration?.registration_verification_status || 'locked') === 'verified';
  const attendanceEligible = registration?.attendance_eligibility === true;
  const attendanceStatus = registration?.attendance_status || 'not_marked';
  const attendanceMarked = !!attendanceStatus && attendanceStatus !== 'not_marked';

  const selectedEventNames = (() => {
    const names: string[] = [];
    const sel = registration?.selectedEvents;
    if (sel?.regular && Array.isArray(sel.regular)) {
      sel.regular.forEach((ev: any) => {
        if (ev?.eventName) names.push(String(ev.eventName));
      });
    }
    if (sel?.gaming?.eventName) names.push(String(sel.gaming.eventName));
    if (names.length === 0 && registration?.event_name) names.push(String(registration.event_name));
    return names;
  })();

  const items: Array<{ label: string; value: string; state: StatusItemProps['state'] }> = [
    {
      label: 'Registration ID',
      value: registration?.registration_id || '—',
      state: 'info',
    },
    {
      label: 'Selected Event(s)',
      value: selectedEventNames.length > 0 ? selectedEventNames.join(', ') : '—',
      state: 'info',
    },
    {
      label: 'Total Registration Fee',
      value: `₹${Number(registration?.fee) || 0}`,
      state: 'info',
    },
    {
      label: 'Payment Status',
      value: paymentVerified ? 'Payment Verified' : paymentRejected ? 'Payment Rejected' : 'Pending Verification',
      state: paymentVerified ? 'done' : paymentRejected ? 'rejected' : 'pending',
    },
    {
      label: 'Faculty Payment Verification',
      value: paymentVerified ? 'Approved by Faculty' : paymentRejected ? 'Rejected' : 'Pending Faculty Verification',
      state: paymentVerified ? 'done' : paymentRejected ? 'rejected' : 'pending',
    },
    {
      label: 'Registration Team Verification',
      value: deskVerified ? 'Verified at Registration Desk' : 'Pending Registration Desk',
      state: deskVerified ? 'done' : 'pending',
    },
    {
      label: 'Attendance Status',
      value: attendanceMarked
        ? `Attendance Marked (${attendanceStatus})`
        : attendanceEligible
          ? 'Attendance Eligible — not yet marked'
          : 'Attendance Not Marked',
      state: attendanceMarked || attendanceEligible ? 'done' : attendanceEligible ? 'pending' : 'info',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-widest">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Registration Submitted
          </span>
        </div>
        <p className="text-xs text-white/60 leading-relaxed">
          You have already submitted your registration for CASYUM. Duplicate registrations are not
          allowed. Your dashboard is now read-only — if you need to correct any details, please
          contact the event administration.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Registration Status</span>
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {statusItemIcon(item.state)}
              <span className="text-[11px] text-white/50">{item.label}</span>
            </div>
            <span
              className={`text-[11px] font-bold text-right ${
                item.state === 'done'
                  ? 'text-emerald-300'
                  : item.state === 'rejected'
                    ? 'text-rose-300'
                    : item.state === 'pending'
                      ? 'text-amber-300'
                      : 'text-white/80'
              }`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface ProfileCompletionFormProps {
  profile: { phone: string; college: string; city: string; department: string; year_of_study: string };
  setProfile: React.Dispatch<React.SetStateAction<{ phone: string; college: string; city: string; department: string; year_of_study: string }>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  fullName: string;
}

const ProfileCompletionForm: React.FC<ProfileCompletionFormProps> = ({ profile, setProfile, errors, setErrors, saving, onSubmit, fullName }) => {
  const setField = (field: keyof typeof profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-6 sm:px-10 py-8 border-b border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-violet-400">Welcome aboard</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display mt-1">
          Complete your <span className="text-gradient">Profile</span>
        </h1>
        <p className="text-sm text-white/50 mt-2 max-w-lg">
          Hi {fullName}, please tell us a little more about yourself. You will be able to register for events once your profile is complete.
        </p>
      </div>

      <form onSubmit={onSubmit} className="px-6 sm:px-10 py-8 flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <input
              type="tel"
              placeholder="Phone Number"
              value={profile.phone}
              onChange={(e) => { setField('phone', e.target.value); if (errors.phone) setErrors((f) => ({ ...f, phone: '' })); }}
              className={`${inputClass} ${errors.phone ? 'border-rose-500/60' : ''}`}
              autoComplete="tel"
            />
            {errors.phone && <span className="text-[10px] text-rose-400 px-1">{errors.phone}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="College Name"
              value={profile.college}
              onChange={(e) => { setField('college', e.target.value); if (errors.college) setErrors((f) => ({ ...f, college: '' })); }}
              className={`${inputClass} ${errors.college ? 'border-rose-500/60' : ''}`}
              autoComplete="organization"
            />
            {errors.college && <span className="text-[10px] text-rose-400 px-1">{errors.college}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Department"
              value={profile.department}
              onChange={(e) => { setField('department', e.target.value); if (errors.department) setErrors((f) => ({ ...f, department: '' })); }}
              className={`${inputClass} ${errors.department ? 'border-rose-500/60' : ''}`}
              autoComplete="organization-title"
            />
            {errors.department && <span className="text-[10px] text-rose-400 px-1">{errors.department}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <select
              value={profile.year_of_study}
              onChange={(e) => { setField('year_of_study', e.target.value); if (errors.year_of_study) setErrors((f) => ({ ...f, year_of_study: '' })); }}
              className={`${inputClass} ${profile.year_of_study === '' ? 'text-white/30' : ''} ${errors.year_of_study ? 'border-rose-500/60' : ''}`}
            >
              <option value="" disabled className="text-white bg-zinc-900">Year of Study</option>
              {YEARS.map((y) => (
                <option key={y} value={y} className="text-white bg-zinc-900">{y}</option>
              ))}
            </select>
            {errors.year_of_study && <span className="text-[10px] text-rose-400 px-1">{errors.year_of_study}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="City"
              value={profile.city}
              onChange={(e) => { setField('city', e.target.value); if (errors.city) setErrors((f) => ({ ...f, city: '' })); }}
              className={`${inputClass} ${errors.city ? 'border-rose-500/60' : ''}`}
              autoComplete="address-level2"
              maxLength={100}
            />
            {errors.city && <span className="text-[10px] text-rose-400 px-1">{errors.city}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Once saved, you can browse and register for active CASYUM events.</span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-violet-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <UserRound className="w-4 h-4" />
              Save &amp; Continue
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ParticipantDashboard;
