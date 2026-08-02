import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, UserCheck, TrendingUp, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useCasyumFaculty } from '../context/CasyumFacultyContext';
import { subscribeAllAttendance, type AttendanceRecordRow } from '../../services/attendanceService';

export const AttendanceOverviewPage: React.FC = () => {
  const { events, registrations } = useCasyumFaculty();
  const [attendance, setAttendance] = useState<AttendanceRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeAllAttendance(
      (rows) => {
        setAttendance(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribe;
  }, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .map((e) => {
        const regs = registrations.filter((r) => r.event_id === e.id);
        const eligible = regs.filter((r) => r.attendanceEligibility === true);
        const present = regs.filter((r) =>
          attendance.some(
            (a) => a.event_id === e.id && a.participant_id === r.participant_id && a.status === 'Present'
          )
        ).length;
        const absent = regs.filter((r) =>
          attendance.some(
            (a) => a.event_id === e.id && a.participant_id === r.participant_id && a.status === 'Absent'
          )
        ).length;
        const marked = present + absent;
        const percentage = eligible.length === 0 ? 0 : Math.round((present / eligible.length) * 100);
        return { ...e, regs: regs.length, eligible: eligible.length, present, absent, marked, percentage };
      })
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.name.localeCompare(b.name));
  }, [events, registrations, attendance, query]);

  const totals = useMemo(
    () => ({
      eligible: rows.reduce((s, r) => s + r.eligible, 0),
      present: rows.reduce((s, r) => s + r.present, 0),
      absent: rows.reduce((s, r) => s + r.absent, 0),
      marked: rows.reduce((s, r) => s + r.marked, 0),
    }),
    [rows]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 select-none pb-16">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Attendance Monitoring</span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Attendance Overview</h2>
        <p className="text-[11px] text-white/50">
          Only attendance-eligible participants can be marked by coordinators.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-violet-500/10 border border-violet-500/25 backdrop-blur-md flex flex-col gap-2">
          <span className="text-xs font-semibold text-violet-300/70">Eligible to Attend</span>
          <span className="text-2xl font-extrabold text-white font-display">{totals.eligible}</span>
        </div>
        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 backdrop-blur-md flex flex-col gap-2">
          <span className="text-xs font-semibold text-emerald-300/70">Present</span>
          <span className="text-2xl font-extrabold text-white font-display">{totals.present}</span>
        </div>
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/25 backdrop-blur-md flex flex-col gap-2">
          <span className="text-xs font-semibold text-rose-300/70">Absent</span>
          <span className="text-2xl font-extrabold text-white font-display">{totals.absent}</span>
        </div>
        <div className="p-5 rounded-3xl bg-cyan-500/10 border border-cyan-500/25 backdrop-blur-md flex flex-col gap-2">
          <span className="text-xs font-semibold text-cyan-300/70">Attendance Marked</span>
          <span className="text-2xl font-extrabold text-white font-display">{totals.marked}</span>
        </div>
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
                <th className="p-4">Registrations</th>
                <th className="p-4">Eligible</th>
                <th className="p-4">Present</th>
                <th className="p-4">Absent</th>
                <th className="p-4">Not Marked</th>
                <th className="p-4">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">No events found.</td>
                </tr>
              ) : (
                rows.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
                          <UserCheck className="w-4 h-4 text-violet-300" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{e.name}</span>
                          <span className="text-[10px] text-white/40">
                            {e.event_date ? new Date(e.event_date).toLocaleDateString() : ''} · {e.venue || ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-white">{e.regs}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-violet-500/20 text-violet-300 border-violet-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        {e.eligible}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                        {e.present}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border bg-rose-500/20 text-rose-300 border-rose-500/30">
                        <XCircle className="w-3 h-3" />
                        {e.absent}
                      </span>
                    </td>
                    <td className="p-4 text-white/50">{Math.max(0, e.eligible - e.marked)}</td>
                    <td className="p-4 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${e.percentage}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          {e.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
