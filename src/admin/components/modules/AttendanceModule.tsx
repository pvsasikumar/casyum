import React, { useState } from 'react';
import {
  Search,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { exportToCSV, exportToPrintableReport } from '../../utils/exportUtils';

export const AttendanceModule: React.FC = () => {
  const { events, participants, attendance, markAttendance } = useAdmin();
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [search, setSearch] = useState('');

  const currentEvent = events.find((e) => e.id === selectedEventId);
  const eventParticipants = participants.filter((p) => p.registeredEvents?.includes(selectedEventId));

  const filteredParticipants = eventParticipants.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.registerNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.college.toLowerCase().includes(search.toLowerCase())
  );

  const eventAttendanceLogs = attendance.filter((a) => a.eventId === selectedEventId);
  const presentCount = eventAttendanceLogs.filter((a) => a.status === 'Present').length;
  const lateCount = eventAttendanceLogs.filter((a) => a.status === 'Late').length;
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

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            QR Scanner & Check-In Matrix
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
            <span>Export PDF</span>
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
        </div>

        {/* Gauge stats */}
        <div className="flex items-center gap-6 text-center w-full md:w-auto justify-around border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-white font-display">{eventParticipants.length}</span>
            <span className="text-[10px] text-white/40 uppercase font-semibold">Total Roster</span>
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-emerald-400 font-display">{presentCount}</span>
            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Present</span>
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-amber-400 font-display">{lateCount}</span>
            <span className="text-[10px] text-amber-400 uppercase font-semibold">Late</span>
          </div>

          <div className="flex flex-col">
            <span className="text-2xl font-extrabold text-violet-400 font-display">{pct}%</span>
            <span className="text-[10px] text-violet-400 uppercase font-semibold">Turnout Rate</span>
          </div>
        </div>
      </div>

      {/* Participant Roster & Attendance Controls */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white font-display">
            Event Roster for &quot;{currentEvent?.name}&quot;
          </h3>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roster..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">College</th>
                <th className="p-4">Reg Number</th>
                <th className="p-4">Current Status</th>
                <th className="p-4">Last Checked</th>
                <th className="p-4 text-right">Mark Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-white/40">
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
                          <span className="font-bold text-white">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-white/70">{p.college}</td>
                      <td className="p-4 font-mono text-white/70">{p.registerNumber}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'Present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : status === 'Late'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-white/40">
                        {record ? `${record.timestamp} (${record.checkedBy})` : 'Not checked in'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => markAttendance(p.id, selectedEventId, 'Present')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              status === 'Present'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => markAttendance(p.id, selectedEventId, 'Late')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              status === 'Late'
                                ? 'bg-amber-500 text-white'
                                : 'bg-white/5 hover:bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => markAttendance(p.id, selectedEventId, 'Absent')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              status === 'Absent'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-white/40'
                            }`}
                          >
                            Absent
                          </button>
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
    </div>
  );
};
