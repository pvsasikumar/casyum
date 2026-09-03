import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ScanLine,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  BadgeCheck,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Mail,
  Phone,
  GraduationCap,
  MapPin,
  CreditCard,
  IdCard,
  RotateCcw,
  Eye,
  Users,
  ChevronLeft,
  ChevronRight,
  Image,
} from 'lucide-react';
import { useRegistrationTeam } from '../context/RegistrationTeamContext';
import { QRScanner } from '../../components/scanner/QRScanner';
import { scanForDeskVerification } from '../../services/qrVerificationService';
import type { ScannedParticipant } from '../../services/participantLookupService';
import {
  verifyParticipant,
  rejectParticipant,
  resetVerification,
  VERIFICATION_REJECT_REASONS,
  type VerificationParticipantRow,
} from '../../services/verificationService';
import { syncRegistrationDeskVerification } from '../../services/registrationService';

const PAGE_SIZE = 10;

const VERIFICATION_BADGE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  Pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
  Verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: BadgeCheck },
  Rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle },
};

const paymentClass = (status: string) =>
  status === 'verified'
    ? 'text-emerald-400'
    : status === 'rejected'
      ? 'text-rose-400'
      : 'text-amber-400';

const MiniStat: React.FC<{ label: string; value: number; cls: string }> = ({ label, value, cls }) => (
  <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-1">
    <span className={`text-xl font-extrabold font-display ${cls}`}>{value}</span>
    <span className="text-[10px] font-semibold text-white/50">{label}</span>
  </div>
);

const Select: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; placeholder: string }> = ({
  value,
  onChange,
  options,
  placeholder,
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white/80 focus:outline-none focus:border-violet-500/50 cursor-pointer"
  >
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o} className="bg-zinc-900">
        {o}
      </option>
    ))}
  </select>
);

const TableSkeleton: React.FC = () => (
  <div className="flex flex-col divide-y divide-white/5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-3.5">
        <div className="w-9 h-9 rounded-full bg-white/5 animate-pulse shrink-0" />
        <div className="flex-1 h-3 rounded bg-white/5 animate-pulse" />
        <div className="w-24 h-3 rounded bg-white/5 animate-pulse" />
        <div className="w-32 h-3 rounded bg-white/5 animate-pulse" />
        <div className="w-20 h-3 rounded bg-white/5 animate-pulse" />
      </div>
    ))}
  </div>
);

const Pagination: React.FC<{ page: number; pageCount: number; total: number; onChange: (p: number) => void }> = ({
  page,
  pageCount,
  total,
  onChange,
}) => (
  <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between gap-3">
    <span className="text-[10px] text-white/40">
      Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
    </span>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] text-white/60 font-bold">
        {page} / {pageCount}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

function rowFromProfile(profile: ScannedParticipant): VerificationParticipantRow {
  return {
    id: profile.id,
    participant_id: profile.participantId,
    casyumId: profile.casyumId,
    full_name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    college: profile.college,
    city: profile.city,
    department: profile.department,
    year_of_study: profile.yearOfStudy,
    register_number: profile.registerNumber,
    profilePicture: profile.profilePicture,
    payment_status: profile.paymentStatus,
    payment_verified: profile.paymentVerified,
    payment_screenshot_url: profile.payment_screenshot_url || '',
    payment_screenshot_file_id: profile.payment_screenshot_file_id || '',
    event_ids: profile.eventIds,
    registrationId: profile.registrationId,
    eventNames: profile.eventNames,
    registrationStatus: 'Confirmed',
    verificationStatus: profile.verificationStatus,
    verifiedBy: profile.verifiedBy,
    verifiedByName: profile.verifiedBy,
    verifiedByUserId: '',
    verifiedAt: profile.verifiedAt,
    rejectedBy: '',
    rejectedByName: '',
    rejectedByUserId: '',
    rejectedAt: '',
    rejectionReason: profile.rejectionReason,
    verificationRemarks: profile.rejectionReason,
  };
}

export const VerifyParticipantPage: React.FC = () => {
  const { user, participants, participantsLoading, participantsError, addToast } = useRegistrationTeam();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<VerificationParticipantRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<VerificationParticipantRow | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(VERIFICATION_REJECT_REASONS[0]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error' | 'warning'; title: string; message: string } | null>(null);
  const [manualToken, setManualToken] = useState('');

  const verifier = useMemo(
    () => ({ userId: user?.id || '', name: user?.name || 'Registration Desk' }),
    [user]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, filterEvent, filterDepartment, filterCollege, filterYear, filterStatus]);

  const eventOptions = useMemo(() => {
    const set = new Set<string>();
    participants.forEach((p) => p.eventNames.forEach((n) => set.add(n)));
    return Array.from(set).sort();
  }, [participants]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.department).filter(Boolean))).sort(),
    [participants]
  );
  const collegeOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.college).filter(Boolean))).sort(),
    [participants]
  );
  const yearOptions = useMemo(
    () => Array.from(new Set(participants.map((p) => p.year_of_study).filter(Boolean))).sort(),
    [participants]
  );

  const filtered = useMemo(() => {
    const q = debouncedQuery;
    return participants
      .filter((p) => p.payment_verified === true)
      .filter((p) => {
          if (
            q &&
            !(
              p.full_name.toLowerCase().includes(q) ||
              p.email.toLowerCase().includes(q) ||
              p.phone.toLowerCase().includes(q) ||
              p.city.toLowerCase().includes(q) ||
              p.register_number.toLowerCase().includes(q) ||
              p.registrationId.toLowerCase().includes(q) ||
              p.participant_id.toLowerCase().includes(q) ||
              p.id.toLowerCase().includes(q) ||
              p.casyumId.toLowerCase().includes(q)
            )
          ) {
            return false;
          }
        if (filterEvent && !p.eventNames.includes(filterEvent)) return false;
        if (filterDepartment && p.department !== filterDepartment) return false;
        if (filterCollege && p.college !== filterCollege) return false;
        if (filterYear && p.year_of_study !== filterYear) return false;
        if (filterStatus && p.verificationStatus !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [participants, debouncedQuery, filterEvent, filterDepartment, filterCollege, filterYear, filterStatus]);

  const counts = useMemo(
    () => ({
      total: participants.filter((p) => p.payment_verified === true).length,
      verified: participants.filter((p) => p.payment_verified === true && p.verificationStatus === 'Verified').length,
      pending: participants.filter((p) => p.payment_verified === true && p.verificationStatus === 'Pending').length,
      rejected: participants.filter((p) => p.payment_verified === true && p.verificationStatus === 'Rejected').length,
      blocked: participants.length - participants.filter((p) => p.payment_verified === true).length,
    }),
    [participants]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const findById = (id: string): VerificationParticipantRow | null => {
    const clean = id.trim();
    if (!clean) return null;
    return (
      participants.find(
        (p) => p.id === clean || p.participant_id === clean || p.registrationId === clean || p.casyumId === clean
      ) || null
    );
  };

  const syncSelected = (id: string) => {
    if (selected?.id === id) setSelected(findById(id));
  };

  const handleVerify = async (p: VerificationParticipantRow) => {
    if (p.verificationStatus === 'Verified') return;
    // Desk verification is only allowed once the payment is verified — the
    // same rule Firestore enforces server-side.
    if (p.payment_verified !== true) {
      addToast(
        'Payment not verified',
        'Payment Not Verified. Faculty Coordinator approval is required.',
        'error'
      );
      return;
    }
    setBusyId(p.id);
    try {
      const res = await verifyParticipant(p.id, verifier);
      await syncRegistrationDeskVerification(p.id, 'verified', verifier);
      addToast('Verified', res.message, 'success');
      syncSelected(p.id);
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to verify participant.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const res = await rejectParticipant(rejectTarget.id, verifier, rejectReason);
      await syncRegistrationDeskVerification(rejectTarget.id, 'rejected', verifier);
      addToast('Rejected', res.message, 'warning');
      syncSelected(rejectTarget.id);
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to reject verification.', 'error');
    } finally {
      setBusyId(null);
      setRejectTarget(null);
    }
  };

  const handleUndo = async (p: VerificationParticipantRow) => {
    setBusyId(p.id);
    try {
      await resetVerification(p.id);
      await syncRegistrationDeskVerification(p.id, 'locked');
      addToast('Undo', 'Verification reset to Pending.', 'info');
      syncSelected(p.id);
    } catch {
      addToast('Error', 'Failed to reset verification.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleScanResult = async (data: string) => {
    setScanBusy(true);
    setScanResult(null);
    try {
      const outcome = await scanForDeskVerification(data);
      if (outcome.status === 'invalid') {
        setScanResult({ type: 'error', title: 'Invalid QR Code', message: outcome.message });
        return;
      }
      if (outcome.status === 'not_found') {
        setScanResult({
          type: 'error',
          title: 'Participant Not Found',
          message: outcome.message,
        });
        return;
      }

      const profile = outcome.profile;
      if (!profile) {
        setScanResult({
          type: 'error',
          title: 'Unable to Verify',
          message: outcome.message || 'Unable to verify participant. Please check the connection and try again.',
        });
        return;
      }
      const participantId = profile.participantId;
      let p = findById(participantId) || findById(profile.registrationId);
      if (!p) {
        // The real-time list may be stale — assemble from the fresh profile.
        p = rowFromProfile(profile);
      }

      if (outcome.status === 'payment_pending') {
        setScanOpen(false);
        setSelected(p);
        addToast(
          'Payment Not Verified',
          'Payment Not Verified. Faculty Coordinator approval is required.',
          'warning'
        );
        return;
      }

      if (outcome.status === 'already_rejected') {
        setScanOpen(false);
        setSelected(p);
        addToast('Participant was rejected', outcome.message, 'warning');
        return;
      }

      if (outcome.status === 'already_verified') {
        setScanOpen(false);
        setSelected(p);
        addToast('Already Verified', outcome.message, 'success');
        return;
      }

      // Payment verified and desk verification still pending — complete the
      // Registration Team verification now and report the result.
      try {
        const res = await verifyParticipant(participantId, verifier);
        await syncRegistrationDeskVerification(participantId, 'verified', verifier);
        const verifiedRow: VerificationParticipantRow = {
          ...p,
          verificationStatus: 'Verified',
          verifiedByName: verifier.name,
          verifiedByUserId: verifier.userId,
          verifiedAt: new Date().toISOString(),
        };
        setScanOpen(false);
        setSelected(verifiedRow);
        addToast('Registration Verified', res.message || 'Registration Verified', 'success');
        console.info('[CASYUM:SCAN] verification update result', {
          participantId,
          status: 'verified',
          message: res.message,
        });
      } catch (err: any) {
        console.error('[CASYUM:SCAN] verification update failed', {
          participantId,
          error: String(err?.message || err),
        });
        setScanOpen(false);
        setSelected(p);
        addToast('Error', err?.message || 'Failed to complete registration verification.', 'error');
      }
    } catch (err: any) {
      console.error('[CASYUM:SCAN] scan handler error', {
        raw: data,
        error: String(err?.message || err),
      });
      addToast('Error', err?.message || 'Unable to fetch participant. Please try again.', 'error');
    } finally {
      setScanBusy(false);
    }
  };

  const handleManualLookup = () => {
    if (!manualToken.trim() || scanBusy) return;
    void handleScanResult(manualToken.trim());
  };

  if (!user) return null;

  const statusMeta = selected ? VERIFICATION_BADGE[selected.verificationStatus] : null;
  const StatusIcon = statusMeta?.icon || Clock;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">Participant Verification</h1>
            <p className="text-sm text-white/50 mt-1">
              Search, filter and verify registered participants at the registration desk
            </p>
          </div>
          <button
            onClick={() => { setScanOpen(true); setScanResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-bold cursor-pointer transition-all"
          >
            <ScanLine className="w-3.5 h-3.5" />
            Scan QR
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MiniStat label="Payment Verified" value={counts.total} cls="text-blue-400" />
          <MiniStat label="Pending Verification" value={counts.pending} cls="text-amber-400" />
          <MiniStat label="Verified" value={counts.verified} cls="text-emerald-400" />
          <MiniStat label="Rejected" value={counts.rejected} cls="text-rose-400" />
          <MiniStat label="Payment Not Verified" value={counts.blocked} cls="text-white/40" />
        </div>

        {/* Payment eligibility notice */}
        {counts.blocked > 0 && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Only participants whose payments were <span className="font-bold text-emerald-300">verified</span> by the
              Faculty Coordinator are shown at the Registration Desk. {counts.blocked} participant
              {counts.blocked === 1 ? '' : 's'} with unverified/rejected payments will be hidden until their payment
              is verified.
            </p>
          </div>
        )}

        {/* Search + Filters */}
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-4 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, registration ID, roll number, email or phone..."
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <Select value={filterEvent} onChange={setFilterEvent} options={eventOptions} placeholder="All Events" />
            <Select value={filterDepartment} onChange={setFilterDepartment} options={departmentOptions} placeholder="All Departments" />
            <Select value={filterCollege} onChange={setFilterCollege} options={collegeOptions} placeholder="All Colleges" />
            <Select value={filterYear} onChange={setFilterYear} options={yearOptions} placeholder="All Years" />
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={['Pending', 'Verified', 'Rejected']}
              placeholder="All Statuses"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-white">Participants</span>
            </div>
            <span className="text-[10px] text-white/40">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
          </div>

          {participantsLoading ? (
            <TableSkeleton />
          ) : participantsError ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-xs text-rose-300 max-w-sm">{participantsError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-white/30" />
              </div>
              <h3 className="text-sm font-bold text-white/60 font-display">No Participants Found</h3>
              <p className="text-xs text-white/40 max-w-sm">
                {query || filterEvent || filterDepartment || filterCollege || filterYear || filterStatus
                  ? 'Try adjusting your search or filters.'
                  : 'Registered participants will appear here once available.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[880px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Participant</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Registration</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">College</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">City</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Department</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Events</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Payment</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Status</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40">Verified By</th>
                      <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-white/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pageRows.map((p) => {
                      const badge = VERIFICATION_BADGE[p.verificationStatus];
                      const busy = busyId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                                {p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-white truncate">{p.full_name}</span>
                                <span className="text-[10px] text-white/40 truncate">{p.email || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col min-w-0">
                              {p.casyumId ? (
                                <span className="text-[11px] font-mono font-bold text-violet-300 truncate">{p.casyumId}</span>
                              ) : (
                                <span className="text-[11px] text-white/30 truncate">CAS —</span>
                              )}
                              <span className="text-[11px] text-white/80 truncate">{p.register_number || '—'}</span>
                              {p.registrationId && (
                                <span className="text-[9px] text-white/35 truncate">{p.registrationId}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] text-white/70 truncate block max-w-[140px]">{p.college || '—'}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] text-white/70 truncate block max-w-[140px]">{p.city || '—'}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] text-white/80 truncate">{p.department || '—'}</span>
                              {p.year_of_study && <span className="text-[9px] text-white/35">Year {p.year_of_study}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] text-white/60 truncate block max-w-[140px]">
                              {p.eventNames.length ? p.eventNames.join(', ') : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-bold ${paymentClass(p.payment_status)}`}>{p.payment_status || 'Pending'}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${badge.cls}`}>
                              <badge.icon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-[11px] text-white/60 truncate block max-w-[110px]">
                              {p.verificationStatus === 'Verified' ? (p.verifiedByName || '—') : p.verificationStatus === 'Rejected' ? (p.rejectedByName || '—') : '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                title="View Details"
                                onClick={() => setSelected(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {p.verificationStatus !== 'Verified' && (
                                <button
                                  title="Verify"
                                  disabled={busy}
                                  onClick={() => handleVerify(p)}
                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer disabled:opacity-40"
                                >
                                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {p.verificationStatus !== 'Rejected' && (
                                <button
                                  title="Reject"
                                  disabled={busy}
                                  onClick={() => { setRejectTarget(p); setRejectReason(VERIFICATION_REJECT_REASONS[0]); }}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer disabled:opacity-40"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {p.verificationStatus !== 'Pending' && (
                                <button
                                  title="Undo Verification"
                                  disabled={busy}
                                  onClick={() => handleUndo(p)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer disabled:opacity-40"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
            </>
          )}
        </div>
      </main>

      {/* View Details Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-[1px] shrink-0">
                    {selected.profilePicture ? (
                      <img
                        src={selected.profilePicture}
                        alt={selected.full_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-[15px] object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-sm font-bold text-violet-300">
                        {selected.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{selected.full_name}</span>
                    <span className="text-[10px] text-white/50 truncate">{selected.participant_id}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {statusMeta && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border w-fit ${statusMeta.cls}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusMeta.label}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {selected.casyumId && (
                  <InfoRow icon={BadgeCheck} label="CASYUM ID" value={selected.casyumId} valueClass="font-mono font-bold text-violet-300" />
                )}
                <InfoRow icon={GraduationCap} label="College" value={selected.college || '—'} />
                <InfoRow icon={MapPin} label="City" value={selected.city || '—'} />
                <InfoRow icon={IdCard} label="Register Number" value={selected.register_number || '—'} />
                <InfoRow icon={CreditCard} label="Registration ID" value={selected.registrationId || '—'} />
                <InfoRow icon={Mail} label="Email" value={selected.email || '—'} />
                <InfoRow icon={Phone} label="Phone" value={selected.phone || '—'} />
                <InfoRow
                  icon={GraduationCap}
                  label="Department"
                  value={`${selected.department || 'N/A'}${selected.year_of_study ? ` • Year ${selected.year_of_study}` : ''}`}
                />
                {selected.eventNames.length > 0 && (
                  <InfoRow icon={CheckCircle2} label="Events" value={selected.eventNames.join(', ')} />
                )}
                <InfoRow
                  icon={CreditCard}
                  label="Payment"
                  value={selected.payment_status || 'Pending'}
                  valueClass={paymentClass(selected.payment_status)}
                />
                {selected.payment_screenshot_url && (
                  <div className="flex items-center gap-2.5 text-xs mt-1">
                    <Image className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <span className="text-white/40 w-28 shrink-0">Screenshot</span>
                    <a
                      href={selected.payment_screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-bold transition-colors"
                    >
                      View Payment Screenshot
                    </a>
                  </div>
                )}
              </div>

              {selected.verificationStatus === 'Verified' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Verified By</span>
                  <span className="text-xs text-emerald-200">{selected.verifiedByName || '—'}</span>
                  {selected.verifiedAt && (
                    <span className="text-[10px] text-emerald-300/70">{new Date(selected.verifiedAt).toLocaleString()}</span>
                  )}
                </div>
              )}

              {selected.verificationStatus === 'Rejected' && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Rejected</span>
                  <span className="text-xs text-rose-200">{selected.rejectionReason || selected.verificationRemarks || 'No remarks'}</span>
                  <span className="text-[10px] text-rose-300/70">
                    by {selected.rejectedByName || '—'}
                    {selected.rejectedAt ? ` at ${new Date(selected.rejectedAt).toLocaleString()}` : ''}
                  </span>
                </div>
              )}

              {selected.payment_verified !== true && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Payment Not Verified. Faculty Coordinator approval is required.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-1">
                {selected.verificationStatus !== 'Verified' && selected.payment_verified === true && (
                  <button
                    onClick={() => handleVerify(selected)}
                    disabled={busyId === selected.id}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busyId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                    Verify Participant
                  </button>
                )}
                {selected.verificationStatus !== 'Rejected' && (
                  <button
                    onClick={() => { setRejectTarget(selected); setRejectReason(VERIFICATION_REJECT_REASONS[0]); }}
                    disabled={busyId === selected.id}
                    className="w-full py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Verification
                  </button>
                )}
                {selected.verificationStatus !== 'Pending' && (
                  <button
                    onClick={() => handleUndo(selected)}
                    disabled={busyId === selected.id}
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Undo Verification
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold font-display text-white">Reject Verification</h3>
                </div>
                <button onClick={() => setRejectTarget(null)} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-white/70">
                Rejecting <span className="text-white font-semibold">{rejectTarget.full_name}</span>. Select a reason below.
              </p>
              <div className="flex flex-col gap-2">
                {VERIFICATION_REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRejectReason(r)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${rejectReason === r ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : 'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/25'}`}
                  >
                    {r}
                    {rejectReason === r && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-end gap-3 mt-1">
                <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={busyId === rejectTarget.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {busyId === rejectTarget.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <AnimatePresence>
        {scanOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold font-display text-white">Scan Participant QR</h3>
                </div>
                <button
                  onClick={() => { setScanOpen(false); setScanBusy(false); setScanResult(null); setManualToken(''); }}
                  className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-white/40">
                Point the camera at the participant's QR code shown on their dashboard. The QR only encodes a unique
                registration token — all details are fetched securely from Firestore after scanning.
              </p>
              <QRScanner onResult={handleScanResult} processing={scanBusy} />

              {scanResult && (
                <div
                  className={`flex items-start gap-2.5 px-3.5 py-3 rounded-xl border ${
                    scanResult.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : scanResult.type === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  {scanResult.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : scanResult.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${scanResult.type === 'success' ? 'text-emerald-300' : scanResult.type === 'warning' ? 'text-amber-300' : 'text-rose-300'}`}>
                      {scanResult.title}
                    </p>
                    <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{scanResult.message}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                <p className="text-[10px] text-white/40">
                  Camera unavailable? Enter the CASYUM id (e.g. <span className="font-mono text-violet-300">CAS00</span>) or registration ID printed on the participant's pass instead.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => { setManualToken(e.target.value); setScanResult(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualLookup(); }}
                    placeholder="e.g. CAS00 or REG-22"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleManualLookup}
                    disabled={scanBusy || !manualToken.trim()}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Look Up
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value: string; valueClass?: string }> = ({ icon: Icon, label, value, valueClass }) => (
  <div className="flex items-center gap-2.5 text-xs">
    <Icon className="w-3.5 h-3.5 text-white/40 shrink-0" />
    <span className="text-white/40 w-28 shrink-0">{label}</span>
    <span className={`text-white/80 truncate ${valueClass || ''}`}>{value}</span>
  </div>
);
