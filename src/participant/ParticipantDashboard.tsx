import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  UploadCloud,
} from 'lucide-react';
import { useRBAC } from '../rbac/context/RBACContext';
import { api } from '../services/api';
import { EventOverviewCms } from '../components/cms/EventOverviewCms';
import { ParticipantQRCard } from './ParticipantQRCard';
import { PaymentDetailsSection } from '../components/events/PaymentDetailsSection';
import { registerEvent, resubmitRegistrationPayment } from '../services/participantService';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Other'];

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';

export const ParticipantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useRBAC();

  const [participant, setParticipant] = useState<any>(null);
  const [openEvents, setOpenEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [profile, setProfile] = useState({ phone: '', college: '', city: '', department: '', year_of_study: '' });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<any>(null);
  const [resubmitTarget, setResubmitTarget] = useState<any>(null);
  const [resubmitProgress, setResubmitProgress] = useState<number | null>(null);
  const [resubmitError, setResubmitError] = useState('');
  const [resubmittingNow, setResubmittingNow] = useState(false);
  const [registerTarget, setRegisterTarget] = useState<any>(null);
  const [registerProgress, setRegisterProgress] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [registeringNow, setRegisteringNow] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [meRes, eventsRes] = await Promise.all([
        api.participant.me(),
        api.event.list({ status: 'Open' }),
      ]);
      setParticipant(meRes.participant);
      setOpenEvents(eventsRes.events || []);
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

  const handleRegister = async (eventId: string | number) => {
    setError('');
    setNotice('');
    const ev = openEvents.find((e) => String(e.id) === String(eventId));
    if (!ev) return;
    setRegisterError('');
    setRegisterTarget(ev);
  };

  const handleRegisterSubmit = async (payment: { payment_method: string; transaction_id: string; file: File }) => {
    if (!registerTarget) return;
    setError('');
    setNotice('');
    setRegisteringNow(true);
    setRegisterProgress(0);
    setRegisterError('');
    try {
      const res = await registerEvent(registerTarget.id, {
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        file: payment.file,
        onProgress: (pct) => setRegisterProgress(pct),
      });
      setNotice(res.message);
      setRegisterTarget(null);
      await loadAll();
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Failed to register for the event.');
    } finally {
      setRegisteringNow(false);
      setRegisterProgress(null);
    }
  };

  const handleResubmit = async (payment: { payment_method: string; transaction_id: string; file: File }) => {
    if (!resubmitTarget) return;
    setError('');
    setNotice('');
    setResubmittingNow(true);
    setResubmitProgress(0);
    setResubmitError('');
    try {
      const res = await resubmitRegistrationPayment(resubmitTarget.registration_id, {
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id,
        file: payment.file,
        onProgress: (pct) => setResubmitProgress(pct),
      });
      setNotice(res.message);
      setResubmitTarget(null);
      await loadAll();
    } catch (err) {
      setResubmitError(err instanceof Error ? err.message : 'Failed to resubmit payment.');
    } finally {
      setResubmittingNow(false);
      setResubmitProgress(null);
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
  const myRegistrations = participant.registered_events || [];
  const avatar = participant.profile_picture || '';

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
                participantName={participant.full_name}
                verificationStatus={participant.verificationStatus || 'Pending'}
                verifiedBy={participant.verifiedBy}
                verifiedAt={participant.verifiedAt}
              />

              {openEvents.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40 text-sm">
                  No events are currently open for registration.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openEvents.map((ev) => {
                    const isFull = Number(ev.registered_count) >= Number(ev.max_participants);
                    const isRegistered = registeredEventIds.has(Number(ev.id));
                    return (
                      <div
                        key={ev.id}
                        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-violet-500/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/80">{ev.category}</span>
                            <h3 className="text-base font-bold tracking-tight truncate">{ev.name}</h3>
                          </div>
                          <span className="flex items-center gap-1 text-violet-300 font-bold text-sm flex-shrink-0">
                            <CircleDollarSign className="w-4 h-4" />
                            ₹{Number(ev.fee) || 0}
                          </span>
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
                          className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                            viewingEvent?.id === ev.id
                              ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/25'
                          }`}
                        >
                          {viewingEvent?.id === ev.id ? (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5" />
                              View Event Details
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleRegister(ev.id)}
                          disabled={isRegistered || isFull}
                          className={`w-full py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                            isRegistered
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                              : 'bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/20'
                          } ${isFull && !isRegistered ? 'opacity-50' : ''}`}
                        >
                          {isRegistered ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Registered
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-3.5 h-3.5" />
                              Register Now
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
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
                    const paymentStatus = reg.payment_status || 'submitted';
                    const isRejected = paymentStatus === 'rejected';
                    const paymentVerified = paymentStatus === 'verified';
                    const deskVerified = (reg.registration_verification_status || 'locked') === 'verified';
                    const attendanceEnabled = reg.attendance_eligibility === true;
                    return (
                      <div
                        key={reg.registration_id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-col gap-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold">{reg.event_name}</span>
                            <span className="text-[11px] text-white/40">
                              {reg.event_date}{reg.event_time ? ` · ${reg.event_time}` : ''} · {reg.venue || 'TBA'}
                            </span>
                            <span className="text-[10px] text-white/30 font-mono">{reg.registration_id}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-white/50">Fee: ₹{Number(reg.fee) || 0}</span>
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                paymentVerified
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : isRejected
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                    : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              }`}
                            >
                              {paymentVerified ? 'Payment Verified' : isRejected ? 'Payment Rejected' : 'Payment Pending'}
                            </span>
                          </div>
                        </div>

                        <RegistrationStatusTracker
                          paymentStatus={paymentStatus}
                          deskVerified={deskVerified}
                          attendanceEnabled={attendanceEnabled}
                          attendanceStatus={reg.attendance_status || 'not_marked'}
                        />

                        {isRejected && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              <span>
                                Payment rejected: {reg.payment_rejection_reason || 'Please verify your payment details.'}
                                {reg.payment_resubmission_count > 0
                                  ? ` (Resubmission #${reg.payment_resubmission_count})`
                                  : ''}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setResubmitError('');
                                setResubmitTarget(reg);
                              }}
                              className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold cursor-pointer transition-all"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              Resubmit Payment
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {resubmitTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
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
              uploadProgress={resubmitProgress}
              error={resubmitError}
              onCancel={() => setResubmitTarget(null)}
              onSubmit={(payment) => void handleResubmit(payment)}
            />
          </div>
        </div>
      )}

      {registerTarget && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Register for Event</span>
                <h3 className="text-base font-bold font-display text-white">{registerTarget.name}</h3>
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
              eventName={registerTarget.name}
              fee={Number(registerTarget.fee) || 0}
              isSubmitting={registeringNow}
              uploadProgress={registerProgress}
              error={registerError}
              onCancel={() => setRegisterTarget(null)}
              onSubmit={(payment) => void handleRegisterSubmit(payment)}
            />
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
