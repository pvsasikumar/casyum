import React, { useMemo, useState } from 'react';
import { Search, Loader2, CheckCircle2, Circle, Hourglass, XCircle, ClipboardList } from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';

const STAGES = [
  { key: 'submitted', label: 'Registration Submitted' },
  { key: 'payment', label: 'Payment Verified' },
  { key: 'desk', label: 'Desk Verified' },
  { key: 'eligible', label: 'Attendance Eligible' },
  { key: 'attendance', label: 'Attendance Marked' },
] as const;

type StageKey = (typeof STAGES)[number]['key'];

function stageFor(p: {
  paymentStatus: string;
  registrationVerificationStatus: string;
  attendanceEligibility: boolean;
  attendanceStatus: string;
}): { stage: number; done: boolean; status: 'pending' | 'done' | 'blocked' } {
  const paymentVerified = p.paymentStatus === 'verified';
  const deskVerified = p.registrationVerificationStatus === 'verified';
  const eligible = p.attendanceEligibility === true;
  const attendanceMarked = !!p.attendanceStatus && p.attendanceStatus !== 'not_marked';

  if (p.paymentStatus === 'rejected') {
    return { stage: 0, done: false, status: 'blocked' };
  }
  let stage = 0;
  if (paymentVerified) stage = 1;
  if (paymentVerified && deskVerified) stage = 2;
  if (paymentVerified && deskVerified && eligible) stage = 3;
  if (paymentVerified && deskVerified && eligible && attendanceMarked) stage = 4;
  return { stage, done: stage === 4, status: 'done' };
}

export const RegistrationStatusPage: React.FC = () => {
  const { registrations, registrationsLoading } = useCasyumFaculty();
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<StageKey | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations
      .filter((r) => {
        const stage = stageFor(r).stage;
        if (stageFilter !== 'All' && STAGES[stage].key !== stageFilter) return false;
        if (
          q &&
          !(
            r.user_full_name.toLowerCase().includes(q) ||
            r.registration_id.toLowerCase().includes(q) ||
            (r.event_name || '').toLowerCase().includes(q) ||
            r.college.toLowerCase().includes(q)
          )
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  }, [registrations, query, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<StageKey, number> = { submitted: 0, payment: 0, desk: 0, eligible: 0, attendance: 0 };
    registrations.forEach((r) => {
      const stage = stageFor(r).stage;
      for (let i = 0; i <= stage; i += 1) {
        counts[STAGES[i].key] += 1;
      }
    });
    return counts;
  }, [registrations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Workflow Pipeline</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Registration Status</h2>
        <p className="text-[11px] text-white/50">
          Every registration flows through: Registration → Payment Verification → Desk Verification → Attendance Eligible → Attendance
        </p>
      </div>

      {/* Stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => setStageFilter(stageFilter === stage.key ? 'All' : stage.key)}
            className={`p-4 rounded-2xl border backdrop-blur-md text-left transition-all cursor-pointer ${
              stageFilter === stage.key
                ? 'bg-violet-500/15 border-violet-500/40'
                : 'bg-zinc-950/60 border-white/10 hover:border-violet-500/30'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{stage.label}</span>
            <span className="text-2xl font-extrabold font-display text-white mt-1 block">{stageCounts[stage.key]}</span>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by participant, registration ID, event or college..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white min-w-[1080px]">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">Event</th>
                <th className="p-4">Registration ID</th>
                <th className="p-4">Workflow Progress</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Desk</th>
                <th className="p-4">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrationsLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">No registrations found.</td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const stage = stageFor(r);
                  return (
                    <tr key={r.registration_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{r.user_full_name}</span>
                          <span className="text-[10px] text-white/40">{r.college || '—'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/70">{r.event_name || r.event_id}</td>
                      <td className="p-4 font-mono text-[11px] text-white/60">{r.registration_id}</td>
                      <td className="p-4 min-w-[300px]">
                        <div className="flex items-center gap-1">
                          {STAGES.map((s, i) => {
                            const isDone = i <= stage.stage;
                            const isBlocked = stage.status === 'blocked' && i === 1;
                            return (
                              <div key={s.key} className="flex items-center gap-1 flex-1 last:flex-none" title={s.label}>
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                                    isBlocked
                                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                      : isDone
                                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                      : 'bg-white/5 border-white/15 text-white/30'
                                  }`}
                                >
                                  {isBlocked ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Circle className="w-3 h-3" />
                                  )}
                                </div>
                                {i < STAGES.length - 1 && (
                                  <div className={`h-0.5 flex-1 rounded ${i < stage.stage ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <span className="text-[9px] text-white/40 mt-1 block">
                          {stage.status === 'blocked' ? 'Payment rejected — awaiting resubmission' : STAGES[stage.stage].label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.paymentStatus === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.paymentStatus === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {r.paymentStatus === 'verified' ? 'Verified' : r.paymentStatus === 'rejected' ? 'Rejected' : 'Submitted'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            r.registrationVerificationStatus === 'verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : r.registrationVerificationStatus === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}
                        >
                          {r.registrationVerificationStatus || 'locked'}
                        </span>
                      </td>
                      <td className="p-4">
                        {r.attendanceStatus && r.attendanceStatus !== 'not_marked' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {r.attendanceStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/35 flex items-center gap-1">
                            <Hourglass className="w-3 h-3" />
                            Not marked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <ClipboardList className="w-3.5 h-3.5 text-violet-400" />
        Click a stage card to filter registrations at that stage.
      </div>
    </div>
  );
};
