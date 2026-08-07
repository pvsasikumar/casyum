import React, { useMemo, useState } from 'react';
import { Wallet, CheckCircle2, XCircle, Clock, TrendingUp, UserCheck, Download } from 'lucide-react';
import { useObserver } from '../context/ObserverContext';
import { ReadOnlyBadge } from '../components/ReadOnlyBanner';

export const ReportsPage: React.FC = () => {
  const { events, registrations, attendance } = useObserver();
  const [view, setView] = useState<'overview' | 'payments' | 'attendance'>('overview');

  const data = useMemo(() => {
    const verified = registrations.filter((r) => r.paymentStatus === 'verified');
    const rejected = registrations.filter((r) => r.paymentStatus === 'rejected');
    const pending = registrations.filter((r) => r.paymentStatus === 'submitted');
    const revenue = verified.reduce((s, r) => s + (r.registrationFee || 0), 0);
    const deskVerified = registrations.filter((r) => r.registrationVerificationStatus === 'verified').length;
    const eligible = registrations.filter((r) => r.attendanceEligibility === true).length;
    return { verified: verified.length, rejected: rejected.length, pending: pending.length, revenue, deskVerified, eligible };
  }, [registrations]);

  const perEvent = useMemo(
    () =>
      events.map((e) => {
        const regs = registrations.filter((r) => r.event_id === e.id || r.event_ids?.includes(String(e.id)));
        const eligible = regs.filter((r) => r.attendanceEligibility === true);
        const present = regs.filter((r) =>
          attendance.some((a) => a.event_id === e.id && a.participant_id === r.participant_id && a.status === 'Present')
        ).length;
        const absent = regs.filter((r) =>
          attendance.some((a) => a.event_id === e.id && a.participant_id === r.participant_id && a.status === 'Absent')
        ).length;
        return { event: e, regs, eligible: eligible.length, present, absent };
      }),
    [events, registrations, attendance]
  );

  const downloadCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPayments = () => {
    const rows: string[][] = [
      ['Registration', 'Participant', 'Event', 'Amount', 'Payment Status', 'Transaction', 'Verified By', 'Verified At'],
      ...registrations.map((r) => [
        r.registration_id,
        r.user_full_name || r.participant_email || '',
        r.event_name || r.event_id,
        String(r.registrationFee || 0),
        r.paymentStatus,
        r.transactionId,
        r.paymentVerifiedByName || r.paymentVerifiedBy || '',
        r.paymentVerifiedAt || '',
      ]),
    ];
    downloadCsv(rows, 'casyum-payment-report.csv');
  };

  const exportAttendance = () => {
    const rows: string[][] = [
      ['Event', 'Registrations', 'Eligible', 'Present', 'Absent', 'Not Marked'],
      ...perEvent.map((e) => [
        e.event.name,
        String(e.regs.length),
        String(e.eligible),
        String(e.present),
        String(e.absent),
        String(Math.max(0, e.eligible - e.present - e.absent)),
      ]),
    ];
    downloadCsv(rows, 'casyum-attendance-report.csv');
  };

  const statCards = [
    { label: 'Total Verified Payments', value: String(data.verified), icon: CheckCircle2, color: 'text-emerald-300' },
    { label: 'Pending Payments', value: String(data.pending), icon: Clock, color: 'text-amber-300' },
    { label: 'Rejected Payments', value: String(data.rejected), icon: XCircle, color: 'text-rose-300' },
    { label: 'Revenue Collected', value: `\u20B9${data.revenue.toLocaleString()}`, icon: Wallet, color: 'text-violet-300' },
    { label: 'Desk Verified', value: String(data.deskVerified), icon: UserCheck, color: 'text-cyan-300' },
    { label: 'Attendance Eligible', value: String(data.eligible), icon: TrendingUp, color: 'text-blue-300' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Insights</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white flex items-center gap-2">
          Reports &amp; Exports
          <ReadOnlyBadge />
        </h2>
        <p className="text-[11px] text-white/50">Payment, attendance and participant summaries.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-col gap-2">
            <span className="text-xs font-semibold text-white/40">{c.label}</span>
            <span className="text-2xl font-extrabold text-white font-display">{c.value}</span>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
        ))}
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs">
            {(['overview', 'payments', 'attendance'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold capitalize transition-colors ${
                  view === v
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportPayments} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white hover:bg-white/10 transition-colors">
              <Download className="w-3.5 h-3.5 text-emerald-300" /> Payments CSV
            </button>
            <button onClick={exportAttendance} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white hover:bg-white/10 transition-colors">
              <Download className="w-3.5 h-3.5 text-cyan-300" /> Attendance CSV
            </button>
          </div>
        </div>

        {view === 'overview' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white min-w-[700px]">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="p-4">Event</th>
                    <th className="p-4">Registrations</th>
                    <th className="p-4">Verified</th>
                    <th className="p-4">Pending</th>
                    <th className="p-4">Rejected</th>
                    <th className="p-4">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-white/40">No data available.</td></tr>
                  ) : (
                    events.map((e) => {
                      const regs = registrations.filter((r) => r.event_id === e.id || r.event_ids?.includes(String(e.id)));
                      const verified = regs.filter((r) => r.paymentStatus === 'verified');
                      return (
                        <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{e.name}</span>
                              <span className="text-[10px] text-white/40">{e.event_date ? new Date(e.event_date).toLocaleDateString() : ''} · {e.venue || ''}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold">{regs.length}</td>
                          <td className="p-4 text-emerald-300 font-bold">{verified.length}</td>
                          <td className="p-4 text-amber-300 font-bold">{regs.filter((r) => r.paymentStatus === 'submitted').length}</td>
                          <td className="p-4 text-rose-300 font-bold">{regs.filter((r) => r.paymentStatus === 'rejected').length}</td>
                          <td className="p-4 font-bold text-white">\u20B9{verified.reduce((s, r) => s + (r.registrationFee || 0), 0).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'payments' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white min-w-[800px]">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="p-4">Participant</th>
                    <th className="p-4">Event</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Transaction</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Verified By</th>
                    <th className="p-4">Verified At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrations.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-white/40">No payment records.</td></tr>
                  ) : (
                    registrations.map((r) => (
                      <tr key={r.registration_id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{r.user_full_name || r.participant_email || '—'}</span>
                            <span className="text-[10px] text-white/40">{r.department || ''}</span>
                          </div>
                        </td>
                        <td className="p-4 text-white/70">{r.event_name || r.event_id}</td>
                        <td className="p-4 font-bold">\u20B9{r.registrationFee || 0}</td>
                        <td className="p-4 text-white/60">{r.transactionId || '—'}</td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.paymentStatus === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.paymentStatus === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {r.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-white/60">{r.paymentVerifiedByName || r.paymentVerifiedBy || '—'}</td>
                        <td className="p-4 text-white/60">{r.paymentVerifiedAt ? new Date(r.paymentVerifiedAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'attendance' && (
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white min-w-[700px]">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="p-4">Event</th>
                    <th className="p-4">Registrations</th>
                    <th className="p-4">Eligible</th>
                    <th className="p-4">Present</th>
                    <th className="p-4">Absent</th>
                    <th className="p-4">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.length === 0 ? (
                    <tr><td colSpan={6} className="p-10 text-center text-white/40">No data available.</td></tr>
                  ) : (
                    perEvent.map((e) => {
                      const rate = e.eligible === 0 ? 0 : Math.round((e.present / e.eligible) * 100);
                      return (
                        <tr key={e.event.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{e.event.name}</span>
                              <span className="text-[10px] text-white/40">{e.event.event_date ? new Date(e.event.event_date).toLocaleDateString() : ''}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold">{e.regs.length}</td>
                          <td className="p-4 text-violet-300 font-bold">{e.eligible}</td>
                          <td className="p-4 text-emerald-300 font-bold">{e.present}</td>
                          <td className="p-4 text-rose-300 font-bold">{e.absent}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-[11px] font-bold text-white">{rate}%</span>
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
        )}
      </div>
    </div>
  );
};
