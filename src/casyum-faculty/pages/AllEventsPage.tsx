import React, { useMemo, useState } from 'react';
import { Calendar, Search, Loader2, MapPin, Clock, IndianRupee } from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  Open: { label: 'Open', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  Closed: { label: 'Closed', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  Full: { label: 'Full', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

export const AllEventsPage: React.FC = () => {
  const { events, eventsLoading, registrations } = useCasyumFaculty();
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .map((e) => {
        const regs = registrations.filter((r) => r.event_id === e.id || r.event_ids?.includes(String(e.id)));
        const verified = regs.filter((r) => r.paymentStatus === 'verified').length;
        const pending = regs.filter((r) => r.paymentStatus === 'submitted').length;
        const rejected = regs.filter((r) => r.paymentStatus === 'rejected').length;
        const revenue = regs
          .filter((r) => r.paymentStatus === 'verified')
          .reduce((sum, r) => sum + (Number(r.registrationFee) || 0), 0);
        return { ...e, regs: regs.length, verified, pending, rejected, revenue };
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.name.localeCompare(b.name));
  }, [events, registrations, query]);

  const totals = useMemo(
    () => ({
      registrations: rows.reduce((s, r) => s + r.regs, 0),
      verified: rows.reduce((s, r) => s + r.verified, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
    }),
    [rows]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">CASYUM Events</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">All Events ({events.length})</h2>
        <p className="text-[11px] text-white/50">
          {totals.registrations} total registrations · {totals.verified} payments verified · {totals.revenue.toLocaleString('en-IN')} revenue
        </p>
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[960px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Event</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Venue</th>
                <th className="p-4">Fee</th>
                <th className="p-4">Registrations</th>
                <th className="p-4">Verified</th>
                <th className="p-4">Pending</th>
                <th className="p-4">Rejected</th>
                <th className="p-4">Revenue</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {eventsLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-xs text-white/40">No events found.</td>
                </tr>
              ) : (
                rows.map((e) => {
                  const meta = STATUS_META[e.status] || STATUS_META.Open;
                  return (
                    <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4 text-violet-300" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{e.name}</span>
                            <span className="text-[10px] text-white/40">{e.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                          <Clock className="w-3 h-3 text-white/40" />
                          {e.event_date ? new Date(e.event_date).toLocaleDateString() : '—'} · {e.time || '—'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[11px] text-white/70">
                          <MapPin className="w-3 h-3 text-white/40" />
                          {e.venue || '—'}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-extrabold text-emerald-400">₹{e.fee}</td>
                      <td className="p-4 font-bold text-white">
                        {e.regs}
                        <span className="text-white/40 font-normal"> / {e.max_participants || '∞'}</span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          {e.verified}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
                          {e.pending}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-rose-500/20 text-rose-300 border-rose-500/30">
                          {e.rejected}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-extrabold text-white flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-emerald-400" />
                        {e.revenue.toLocaleString('en-IN')}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${meta.cls}`}>
                          {meta.label}
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
