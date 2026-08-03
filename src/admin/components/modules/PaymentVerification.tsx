import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Loader2,
  X,
  Search,
  AlertCircle,
} from 'lucide-react';
import {
  subscribePaymentRegistrations,
  verifyPayment,
  rejectPayment,
  type PaymentRegistrationRow,
} from '../../../services/registrationService';
import { paymentMethodLabel } from '../../../services/paymentProofService';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { useAdmin } from '../../context/AdminContext';

type PaymentFilter = 'submitted' | 'verified' | 'rejected' | 'All';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  submitted: { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export const PaymentVerification: React.FC = () => {
  const rbac = useRBAC();
  const { logAction, pushNotification } = useAdmin();
  const [rows, setRows] = useState<PaymentRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentFilter>('submitted');
  const [query, setQuery] = useState('');
  const [verifyTarget, setVerifyTarget] = useState<PaymentRegistrationRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRegistrationRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const verifier = useMemo(
    () => ({ userId: rbac.user?.id || '', name: rbac.user?.name || 'Faculty Coordinator' }),
    [rbac.user]
  );

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribePaymentRegistrations(
      (next) => {
        setRows(next);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
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
  }, [rows, filter, query]);

  const counts = useMemo(
    () => ({
      submitted: rows.filter((r) => r.paymentStatus === 'submitted').length,
      verified: rows.filter((r) => r.paymentStatus === 'verified').length,
      rejected: rows.filter((r) => r.paymentStatus === 'rejected').length,
      total: rows.length,
    }),
    [rows]
  );

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setBusyId(verifyTarget.registration_id);
    try {
      const res = await verifyPayment(verifyTarget.registration_id, verifier);
      logAction('Approved Payment', `Verified payment ₹${verifyTarget.registrationFee} for ${verifyTarget.user_full_name} (${verifyTarget.registration_id})`);
      pushNotification('Payment Verified', `Payment for ${verifyTarget.user_full_name} has been verified.`, 'success');
      setVerifyTarget(null);
      return res.message;
    } catch (err: any) {
      pushNotification('Error', err?.message || 'Failed to verify payment', 'error');
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      pushNotification('Reason Required', 'Please enter a reason for rejecting this payment.', 'warning');
      return;
    }
    setBusyId(rejectTarget.registration_id);
    try {
      await rejectPayment(rejectTarget.registration_id, verifier, rejectReason.trim());
      logAction('Rejected Payment', `Rejected payment for ${rejectTarget.user_full_name} (${rejectTarget.registration_id}): ${rejectReason.trim()}`);
      pushNotification('Payment Rejected', `Payment for ${rejectTarget.user_full_name} was rejected.`, 'error');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      pushNotification('Error', err?.message || 'Failed to reject payment', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Faculty Coordinator · Payment Review
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Payment Verification Queue ({filtered.length})
          </h2>
        </div>

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
              {status === 'All' ? `All (${counts.total})` : `${STATUS_META[status]?.label || status} (${counts[status as 'submitted' | 'verified' | 'rejected'] || 0})`}
            </button>
          ))}
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
              {loading ? (
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
                        <span className="text-[11px] text-white/70">{r.event_name || r.event_id}</span>
                      </td>
                      <td className="p-4 font-mono font-extrabold text-emerald-400">₹{r.registrationFee}</td>
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
