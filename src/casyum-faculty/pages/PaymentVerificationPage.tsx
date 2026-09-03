import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
  X,
  Search,
  AlertCircle,
  History,
  Image,
} from 'lucide-react';
import { verifyPayment, rejectPayment, type PaymentRegistrationRow } from '../../services/registrationService';
import {
  subscribePaymentReviewLogs,
  writePaymentReviewLog,
  type PaymentReviewLogEntry,
} from '../../services/casyumFacultyService';
import { paymentMethodLabel } from '../../services/paymentProofService';
import { useRBAC } from '../../rbac/context/RBACContext';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

type PaymentFilter = 'submitted' | 'verified' | 'rejected' | 'All';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

const LOG_ACTION_STYLES: Record<string, string> = {
  verified: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  resubmitted: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

export const PaymentVerificationPage: React.FC = () => {
  const rbac = useRBAC();
  const { registrations, registrationsLoading, addToast } = useCasyumFaculty();
  const [filter, setFilter] = useState<PaymentFilter>('submitted');
  const [query, setQuery] = useState('');
  const [verifyTarget, setVerifyTarget] = useState<PaymentRegistrationRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRegistrationRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [logs, setLogs] = useState<PaymentReviewLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [showLogs, setShowLogs] = useState(false);

  const verifier = useMemo(
    () => ({ userId: rbac.user?.id || '', name: rbac.user?.name || 'CASYUM Faculty Coordinator' }),
    [rbac.user]
  );

  useEffect(() => {
    const unsubscribe = subscribePaymentReviewLogs(
      (next) => {
        setLogs(next);
        setLogsLoading(false);
      },
      () => setLogsLoading(false)
    );
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations
      .filter((r) => {
        if (filter !== 'All' && r.paymentStatus !== filter) return false;
        if (
          q &&
          !(
            r.user_full_name.toLowerCase().includes(q) ||
            r.registration_id.toLowerCase().includes(q) ||
            r.transactionId.toLowerCase().includes(q) ||
            (r.event_name || '').toLowerCase().includes(q) ||
            r.college.toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  }, [registrations, filter, query]);

  const counts = useMemo(
    () => ({
      submitted: registrations.filter((r) => r.paymentStatus === 'submitted').length,
      verified: registrations.filter((r) => r.paymentStatus === 'verified').length,
      rejected: registrations.filter((r) => r.paymentStatus === 'rejected').length,
      total: registrations.length,
    }),
    [registrations]
  );

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setBusyId(verifyTarget.registration_id);
    try {
      const res = await verifyPayment(verifyTarget.registration_id, verifier);
      await writePaymentReviewLog({
        registration_id: verifyTarget.registration_id,
        participant_id: verifyTarget.participant_id,
        participant_name: verifyTarget.user_full_name,
        event_id: verifyTarget.event_id,
        event_name: verifyTarget.event_name || verifyTarget.event_id,
        action: 'verified',
        reviewer_id: verifier.userId,
        reviewer_name: verifier.name,
      });
      addToast('Payment Verified', `Payment for ${verifyTarget.user_full_name} has been verified.`, 'success');
      setVerifyTarget(null);
      return res.message;
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to verify payment', 'error');
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      addToast('Reason Required', 'Please enter a reason for rejecting this payment.', 'warning');
      return;
    }
    setBusyId(rejectTarget.registration_id);
    try {
      await rejectPayment(rejectTarget.registration_id, verifier, rejectReason.trim());
      await writePaymentReviewLog({
        registration_id: rejectTarget.registration_id,
        participant_id: rejectTarget.participant_id,
        participant_name: rejectTarget.user_full_name,
        event_id: rejectTarget.event_id,
        event_name: rejectTarget.event_name || rejectTarget.event_id,
        action: 'rejected',
        reviewer_id: verifier.userId,
        reviewer_name: verifier.name,
        reason: rejectReason.trim(),
      });
      addToast('Payment Rejected', `Payment for ${rejectTarget.user_full_name} was rejected.`, 'error');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to reject payment', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            CASYUM Faculty Coordinator · Payment Review
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Payment Verification Queue ({filtered.length})
          </h2>
          <p className="text-[11px] text-white/50">
            Only CASYUM Faculty Coordinators can verify or reject payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            Review Activity
          </button>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
            {(['submitted', 'verified', 'rejected', 'All'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                  filter === status
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {status === 'All'
                  ? `All (${counts.total})`
                  : `${STATUS_META[status]?.label || status} (${counts[status as 'submitted' | 'verified' | 'rejected'] || 0})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, registration ID, transaction ID, event or college..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[1100px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Registration ID</th>
                <th className="p-4">Participant</th>
                <th className="p-4">Event</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Submitted Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrationsLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs text-white/40">
                    No payment submissions found under status &quot;{filter}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const meta = STATUS_META[r.paymentStatus] || STATUS_META.submitted;
                  const busy = busyId === r.registration_id;
                  return (
                    <tr key={r.registration_id} className="hover:bg-white/[0.02] transition-colors align-top">
                      <td className="p-4 font-mono text-[11px] text-white/60">{r.registration_id}</td>
                      <td className="p-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white">{r.user_full_name}</span>
                          <span className="text-[10px] text-white/40 truncate max-w-[160px]">{r.college}</span>
                          <span className="text-[10px] text-white/35">{r.department}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[11px] text-white/70">{r.event_name || r.event_id}</span>
                          {r.selectedEvents && (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {Array.isArray(r.selectedEvents.regular) &&
                                r.selectedEvents.regular.map((ev: any) => (
                                  <span key={String(ev?.eventId)} className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/25 text-violet-300 text-[8px] font-bold">
                                    {ev?.eventName}
                                  </span>
                                ))}
                              {r.selectedEvents.gaming && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[8px] font-bold">
                                  {r.selectedEvents.gaming.eventName}
                                </span>
                              )}
                            </div>
                          )}
                          {r.paymentScreenshotUrl && (
                            <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                              <span className="text-white/50">Payment Screenshot</span>
                              <a
                                href={r.paymentScreenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-bold transition-colors"
                              >
                                <Image className="w-3 h-3" />
                                View Screenshot
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-extrabold text-emerald-400">₹{r.registrationFee}</span>
                        {(Number(r.regularFee) > 0 || Number(r.gamingFee) > 0) && (
                          <div className="mt-0.5 text-[8px] text-white/40 whitespace-nowrap">
                            {Number(r.regularFee) > 0 && `₹${r.regularFee} regular`}
                            {Number(r.regularFee) > 0 && Number(r.gamingFee) > 0 && ' + '}
                            {Number(r.gamingFee) > 0 && `₹${r.gamingFee} gaming`}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-[11px] text-white/70">{paymentMethodLabel(r.paymentMethod)}</td>
                      <td className="p-4">
                        <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 break-all">
                          {r.transactionId || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-white/60 text-[11px]">
                        {r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${meta.cls}`}>
                          <ShieldCheck className="w-3 h-3" />
                          {meta.label}
                        </span>
                        {r.paymentStatus === 'rejected' && r.paymentRejectionReason && (
                          <div className="mt-1 text-[9px] text-rose-300/80 max-w-[140px] line-clamp-2">
                            {r.paymentRejectionReason}
                          </div>
                        )}
                        {r.paymentStatus === 'verified' && (
                          <div className="mt-1 text-[9px] text-emerald-300/70">
                            by {r.paymentVerifiedByName || '—'}
                            {r.paymentVerifiedAt ? ` · ${new Date(r.paymentVerifiedAt).toLocaleString()}` : ''}
                          </div>
                        )}
                        {r.paymentResubmissionCount > 0 && (
                          <div className="mt-1 text-[9px] text-amber-300/80">
                            Resubmission #{r.paymentResubmissionCount}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-white/50 text-[11px]">
                        {r.registered_at ? new Date(r.registered_at).toLocaleString() : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.paymentScreenshotUrl && (
                            <a
                              href={r.paymentScreenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View payment screenshot"
                              className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 cursor-pointer"
                            >
                              <Image className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {r.paymentStatus !== 'verified' && (
                            <button
                              title="Verify payment"
                              disabled={busy}
                              onClick={() => setVerifyTarget(r)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer disabled:opacity-40"
                            >
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {r.paymentStatus !== 'rejected' && (
                            <button
                              title="Reject payment"
                              disabled={busy}
                              onClick={() => { setRejectReason(''); setRejectTarget(r); }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer disabled:opacity-40"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Activity Panel */}
      {showLogs && (
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Payment Review Activity</span>
              <span className="text-[10px] text-white/40">Every verify / reject / resubmit action by faculty managers</span>
            </div>
            <button
              onClick={() => setShowLogs(false)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex flex-col divide-y divide-white/5 max-h-[480px] overflow-y-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-white/40 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading activity...
              </div>
            ) : logs.length === 0 ? (
              <div className="p-10 text-center text-xs text-white/40">No payment review activity recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${LOG_ACTION_STYLES[log.action] || 'bg-white/10 text-white/70 border-white/15'}`}>
                      {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                    </span>
                    <span className="text-[9px] text-white/35">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-white/70">
                    <span className="font-bold text-white">{log.participant_name}</span> · {log.event_name}
                  </p>
                  {log.reason && <p className="text-[10px] text-rose-300/80">Reason: {log.reason}</p>}
                  <p className="text-[10px] text-white/40">
                    Reviewed by <span className="text-white/60">{log.reviewer_name}</span> · {log.registration_id}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Verify Confirmation Modal */}
      {verifyTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white">Verify Payment</h3>
              </div>
              <button onClick={() => setVerifyTarget(null)} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Participant</span>
                <span className="font-bold text-white">{verifyTarget.user_full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Registration ID</span>
                <span className="font-mono text-white/80">{verifyTarget.registration_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Transaction ID</span>
                <span className="font-mono text-violet-300">{verifyTarget.transactionId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Amount</span>
                <span className="font-mono font-extrabold text-emerald-400">₹{verifyTarget.registrationFee}</span>
              </div>
              {(Number(verifyTarget.regularFee) > 0 || Number(verifyTarget.gamingFee) > 0) && (
                <div className="flex flex-col gap-0.5 text-[10px] text-white/50 border-t border-white/10 pt-2 mt-1">
                  {Number(verifyTarget.regularFee) > 0 && (
                    <span>
                      Regular events fee: <span className="text-white/80">₹{verifyTarget.regularFee}</span>
                    </span>
                  )}
                  {Number(verifyTarget.gamingFee) > 0 && (
                    <span>
                      Gaming event fee: <span className="text-white/80">₹{verifyTarget.gamingFee}</span>
                    </span>
                  )}
                  {verifyTarget.selectedEvents?.gaming && (
                    <span>
                      Gaming event: <span className="text-rose-300">{verifyTarget.selectedEvents.gaming.eventName}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-white/60">
              Confirm that the payment details above are correct. This will mark the payment as verified and allow Registration Desk verification to proceed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setVerifyTarget(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => void handleVerify()}
                disabled={busyId === verifyTarget.registration_id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {busyId === verifyTarget.registration_id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white">Reject Payment</h3>
              </div>
              <button onClick={() => setRejectTarget(null)} className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Rejecting <span className="text-white font-semibold">{rejectTarget.user_full_name}</span>'s payment ({rejectTarget.registration_id}). The participant will be asked to resubmit with corrected details.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                Rejection Reason (required)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction ID not found in UPI history, amount mismatch..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50 resize-none"
              />
              {!rejectReason.trim() && (
                <span className="flex items-center gap-1 text-[10px] text-rose-400">
                  <AlertCircle className="w-3 h-3" />
                  A rejection reason is required.
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setRejectTarget(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={busyId === rejectTarget.registration_id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {busyId === rejectTarget.registration_id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
