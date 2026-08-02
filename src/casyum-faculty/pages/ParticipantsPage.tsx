import React, { useMemo, useState } from 'react';
import { Search, Loader2, Users } from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

function paymentBadge(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'verified') return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (s === 'rejected') return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  if (s === 'submitted') return { label: 'Submitted', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  return { label: s || 'Pending', cls: 'bg-white/10 text-white/60 border-white/15' };
}

function verificationBadge(status: string) {
  if (status === 'Verified') return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (status === 'Rejected') return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  return { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
}

export const ParticipantsPage: React.FC = () => {
  const { participants, participantsLoading } = useCasyumFaculty();
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants.filter((p) => {
      const pStatus = String(p.payment_status || '').toLowerCase();
      const vStatus = p.verificationStatus;
      if (paymentFilter !== 'All' && pStatus !== paymentFilter) return false;
      if (verificationFilter !== 'All' && vStatus !== verificationFilter) return false;
      if (
        q &&
        !(
          p.full_name.toLowerCase().includes(q) ||
          (p.email || '').toLowerCase().includes(q) ||
          (p.phone || '').includes(q) ||
          (p.college || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q) ||
          (p.register_number || '').toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [participants, query, paymentFilter, verificationFilter]);

  const eligible = filtered.filter(
    (p) => String(p.payment_status || '').toLowerCase() === 'verified' && p.verificationStatus === 'Verified'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">CASYUM Participants</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white flex items-center gap-2">
          Participants ({filtered.length})
          <Users className="w-5 h-5 text-violet-400" />
        </h2>
        <p className="text-[11px] text-white/50">{eligible} attendance-eligible in this view</p>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, college..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="All">All Payment Status</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
          >
            <option value="All">All Desk Status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[980px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">College / City</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Register Number</th>
                <th className="p-4">Registered Events</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Desk Verification</th>
                <th className="p-4">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {participantsLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-white/40">No participants found.</td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const pMeta = paymentBadge(p.payment_status);
                  const vMeta = verificationBadge(p.verificationStatus);
                  const isEligible = String(p.payment_status || '').toLowerCase() === 'verified' && p.verificationStatus === 'Verified';
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                            {p.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{p.full_name}</span>
                            <span className="text-[10px] text-white/40">{p.department || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white/70">{p.college || '—'}</span>
                          <span className="text-[10px] text-white/40">{p.city || ''}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-white/70">{p.email || '—'}</span>
                          <span className="text-white/40">{p.phone || ''}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[11px] text-white/60">{p.register_number || '—'}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 max-w-[220px]">
                          {(p.eventNames.length > 0 ? p.eventNames : [p.event_ids.length > 0 ? `${p.event_ids.length} event(s)` : '—']).map((name, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 truncate">
                              {name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${pMeta.cls}`}>
                          {pMeta.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${vMeta.cls}`}>
                          {vMeta.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap ${
                            isEligible
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}
                        >
                          {isEligible ? 'Eligible' : 'Not Eligible'}
                        </span>
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
