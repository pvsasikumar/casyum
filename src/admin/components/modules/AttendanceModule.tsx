import React, { useState, useEffect } from 'react';
import {
  Search,
  FileSpreadsheet,
  FileText,
  Lock,
  Unlock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Users,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { exportToCSV, exportToPrintableReport } from '../../utils/exportUtils';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { getEventAttendanceLocked, setEventAttendanceLocked } from '../../../services/attendanceService';

export const AttendanceModule: React.FC = () => {
  const { events, participants, attendance, markAttendance, addToast } = useAdmin();
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  useEffect(() => {
    if (!selectedEventId) return;
    getEventAttendanceLocked(selectedEventId)
      .then(setLocked)
      .catch(() => setLocked(false));
  }, [selectedEventId]);

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const isLocked = locked;

  const eventParticipants = participants.filter((p) => p.registeredEvents?.includes(selectedEventId));

  const colleges = Array.from(new Set(eventParticipants.map((p) => p.college))).sort();

  const filteredParticipants = eventParticipants.filter(
    (p) => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.registerNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.college.toLowerCase().includes(search.toLowerCase());
      const matchesCollege = !collegeFilter || p.college === collegeFilter;
      return matchesSearch && matchesCollege;
    }
  );

  const eventAttendanceLogs = attendance.filter((a) => a.eventId === selectedEventId);
  const presentCount = eventAttendanceLogs.filter((a) => a.status === 'Present').length;
  const lateCount = eventAttendanceLogs.filter((a) => a.status === 'Late').length;
  const absentCount = eventParticipants.length - presentCount - lateCount;
  const totalChecked = presentCount + lateCount;
  const pct = eventParticipants.length ? Math.round((totalChecked / eventParticipants.length) * 100) : 0;

  const handleExportAttendanceCSV = () => {
    const data = eventParticipants.map((p) => {
      const rec = eventAttendanceLogs.find((a) => a.participantId === p.id);
      return {
        ID: p.id,
        Name: p.name,
        College: p.college,
        Department: p.department,
        RegNo: p.registerNumber,
        Status: rec ? rec.status : 'Absent',
        Timestamp: rec ? rec.timestamp : 'N/A',
        CheckedBy: rec ? rec.checkedBy : 'N/A',
      };
    });
    exportToCSV(`${currentEvent?.name || 'Event'}_Attendance`, data);
    addToast('Exported', 'Attendance CSV exported successfully', 'success');
  };

  const handleExportAttendancePDF = () => {
    const rows = eventParticipants.map((p) => {
      const rec = eventAttendanceLogs.find((a) => a.participantId === p.id);
      return [
        p.id,
        p.name,
        p.college,
        p.registerNumber,
        rec ? rec.status : 'Absent',
        rec ? rec.timestamp : 'N/A',
      ];
    });
    exportToPrintableReport(
      `Attendance Log - ${currentEvent?.name || 'Event'}`,
      ['ID', 'Name', 'College', 'Reg No', 'Status', 'Time'],
      rows
    );
  };

  const handleToggleLock = () => {
    const nextLocked = !locked;
    setLocked(nextLocked);
    setLockDialogOpen(false);
    setEventAttendanceLocked(selectedEventId, nextLocked).catch(() => {
      setLocked(!nextLocked);
    });
    if (nextLocked) {
      addToast('Attendance Locked', 'Attendance records are now locked for this event', 'warning');
    } else {
      addToast('Attendance Unlocked', 'Attendance records are now editable', 'info');
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Admin Attendance Control
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Attendance Module
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAttendanceCSV}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportAttendancePDF}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Print Report</span>
          </button>
          <button
            onClick={() => setLockDialogOpen(true)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer ${
              isLocked
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
          </button>
        </div>
      </div>

      {/* Event Selector & Stats Banner */}
      <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Select Event</span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-zinc-900 border border-white/15 text-white text-sm font-bold rounded-2xl px-4 py-2.5 focus:outline-none w-full md:w-80"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.venue})
              </option>
            ))}
          </select>
          {isLocked && (
            <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
              <Lock className="w-3 h-3" />
              Attendance is locked. Coordinators cannot edit.
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-center w-full md:w-auto justify-around border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-2xl font-extrabold text-white font-display">{eventParticipants.length}</span>
            </div>
            <span className="text-[10px] text-white/40 uppercase font-semibold">Total Roster</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-2xl font-extrabold text-emerald-400 font-display">{presentCount}</span>
            </div>
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Present</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-2xl font-extrabold text-rose-400 font-display">{absentCount}</span>
            </div>
            <span className="text-[10px] text-rose-400 uppercase font-semibold">Absent</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-2xl font-extrabold text-violet-400 font-display">{pct}%</span>
            </div>
            <span className="text-[10px] text-violet-400 uppercase font-semibold">Turnout Rate</span>
          </div>
        </div>
      </div>

      {/* Participant Roster */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-base font-bold text-white font-display">
            Event Roster for &quot;{currentEvent?.name}&quot;
          </h3>

          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, reg no, college..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white focus:outline-none"
            >
              <option value="">All Colleges</option>
              {colleges.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">College</th>
                <th className="p-4">Department</th>
                <th className="p-4">Reg Number</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Checked</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                    No participants registered for this event yet.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => {
                  const record = eventAttendanceLogs.find((a) => a.participantId === p.id);
                  const status = record?.status || 'Absent';

                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{p.name}</span>
                            <span className="text-[10px] text-white/40">{p.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-white/70">{p.college}</td>
                      <td className="p-4 text-white/70">{p.department}</td>
                      <td className="p-4 font-mono text-white/70">{p.registerNumber}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/10 text-white/40 border border-white/10'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-white/40">
                        {record ? `${record.timestamp} (${record.checkedBy})` : 'Not checked in'}
                      </td>
                      <td className="p-4 text-right">
                        {isLocked ? (
                          <span className="text-[10px] text-amber-400/60">Locked</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => markAttendance(p.id, selectedEventId, 'Present')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                status === 'Present'
                                  ? 'bg-emerald-500 text-white shadow-md'
                                  : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-transparent hover:border-emerald-500/30'
                              }`}
                            >
                              Present
                            </button>
                            <button
                              onClick={() => markAttendance(p.id, selectedEventId, 'Late')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                status === 'Late'
                                  ? 'bg-amber-500 text-white shadow-md'
                                  : 'bg-white/5 hover:bg-amber-500/20 text-amber-400 border border-transparent hover:border-amber-500/30'
                              }`}
                            >
                              Late
                            </button>
                            <button
                              onClick={() => markAttendance(p.id, selectedEventId, 'Absent')}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                status === 'Absent'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-white/5 hover:bg-white/10 text-white/40 border border-transparent hover:border-white/20'
                              }`}
                            >
                              Absent
                            </button>
                          </div>
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

      <ConfirmationDialog
        open={lockDialogOpen}
        title={isLocked ? 'Unlock Attendance' : 'Lock Attendance'}
        message={
          isLocked
            ? 'Unlocking will allow coordinators to edit attendance records again.'
            : 'Locking will prevent all coordinators from editing attendance for this event. You can unlock it later.'
        }
        confirmLabel={isLocked ? 'Unlock' : 'Lock'}
        cancelLabel="Cancel"
        variant={isLocked ? 'warning' : 'danger'}
        onConfirm={handleToggleLock}
        onCancel={() => setLockDialogOpen(false)}
      />
    </div>
  );
};
