import React, { useMemo, useState } from 'react';
import { Search, Loader2, CreditCard } from 'lucide-react';
import { useObserver } from '../context/ObserverContext';
import { ReadOnlyBadge } from '../components/ReadOnlyBanner';

function statusBadge(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'verified') return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (s === 'rejected') return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  if (s === 'not_required') return { label: 'Not Required', cls: 'bg-white/10 text-white/60 border-white/15' };
  return { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
}

export const PaymentsPage: React.FC = () => {
  const { registrations, registrationsLoading } = useObserver();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations
      .filter((r) => {
        if (statusFilter !== 'All' && r.paymentStatus !== statusFilter) return false;
        if (
          q &&
          !(
            (r.user_full_name || '').toLowerCase().includes(q) ||
            (r.participant_email || '').toLowerCase().includes(q) ||
            (r.event_name || '').toLowerCase().includes(q) ||
            (r.transactionId || '').toLowerCase().includes(q) ||
            (r.college || '').toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  }, [registrations, query, statusFilter]);

  const totals = useMemo(
    () => ({
      submitted: rows.filter((r) => r.paymentStatus === 'submitted').length,
      verified: rows.filter((r) => r.paymentStatus === 'verified').length,
      rejected: rows.filter((r) => r.paymentStatus === 'rejected').length,
      revenue: rows
        .filter((r) => r.paymentStatus === 'verified')
        .reduce((s, r) => s + (Number(r.registrationFee) || 0), 0),
    }),
    [rows]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Payment Monitoring</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white flex items-center gap-2">
          Payment Status ({rows.length})
          <CreditCard className="w-5 h-5 text-violet-400" />
          <ReadOnlyBadge />
        </h2>
        <p className="text-[11px] text-white/50">
          {totals.verified} verified · {totals.submitted} submitted · {totals.rejected} rejected · ₹{totals.revenue.toLocaleString('en-IN')} collected
        </p>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, event, transaction..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
        >
          <option value="All">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="not_required">Not Required</option>
        </select>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[960px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">Event</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Verified By</th>
                <th className="p-4">Verified At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrationsLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-white/40">No payment records found.</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const meta = statusBadge(r.paymentStatus);
                  return (
                    <tr key={r.registration_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{r.user_full_name || r.participant_email || '—'}</span>
                          <span className="text-[10px] text-white/40">{r.college || r.department || ''}</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/70">{r.event_name || r.event_id}</td>
                      <td className="p-4 font-mono font-extrabold text-emerald-400">
                        {r.registrationFee ? `₹${Number(r.registrationFee) || 0}` : '—'}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-violet-300">{r.transactionId || '—'}</td>
                      <td className="p-4 text-white/50 text-[11px]">
                        {r.payment_uploaded_time || r.registered_at ? new Date(r.payment_uploaded_time || r.registered_at).toLocaleString() : '—'}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-4 text-white/60 text-[11px]">{r.paymentVerifiedByName || r.paymentVerifiedBy || '—'}</td>
                      <td className="p-4 text-white/50 text-[11px]">
                        {r.paymentVerifiedAt ? new Date(r.paymentVerifiedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
