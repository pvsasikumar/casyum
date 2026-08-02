import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AttendanceRow } from './AttendanceRow';
import type { ParticipantAttendanceView } from '../types';

interface AttendanceTableProps {
  participants: ParticipantAttendanceView[];
  isLoading: boolean;
  savingIds?: Record<string, boolean>;
  onMarkPresent: (participantId: string) => void;
  onMarkAbsent: (participantId: string) => void;
  onMarkAllPresent: () => void;
  onClearAttendance: () => void;
  onSave: () => void;
  eventName: string;
}

const PAGE_SIZE = 10;

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  participants,
  isLoading,
  savingIds = {},
  onMarkPresent,
  onMarkAbsent,
  onMarkAllPresent,
  onClearAttendance,
  onSave,
  eventName,
}) => {
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'regId'>('name');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const colleges = useMemo(() => {
    const set = new Set(participants.map((p) => p.college));
    return Array.from(set).sort();
  }, [participants]);

  const departments = useMemo(() => {
    const set = new Set(participants.map((p) => p.department));
    return Array.from(set).sort();
  }, [participants]);

  const filtered = useMemo(() => {
    let result = [...participants];

    if (search) {
      const q = search.toLowerCase();
      if (searchBy === 'name') {
        result = result.filter((p) => p.participantName.toLowerCase().includes(q));
      } else {
        result = result.filter((p) => p.registrationId.toLowerCase().includes(q));
      }
    }

    if (collegeFilter) {
      result = result.filter((p) => p.college === collegeFilter);
    }

    if (deptFilter) {
      result = result.filter((p) => p.department === deptFilter);
    }

    return result;
  }, [participants, search, searchBy, collegeFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
          <Search className="w-6 h-6 text-white/30" />
        </div>
        <h3 className="text-base font-bold text-white/70 font-display mb-1">No Registrations</h3>
        <p className="text-xs text-white/40">No participants have registered for {eventName} yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
      {/* Search & Filters */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={searchBy === 'name' ? 'Search by name...' : 'Search by Registration ID...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <button
            onClick={() => setSearchBy((prev) => (prev === 'name' ? 'regId' : 'name'))}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/60 hover:text-white transition-all cursor-pointer whitespace-nowrap"
          >
            <Filter className="w-3 h-3 inline mr-1" />
            {searchBy === 'name' ? 'Reg ID' : 'Name'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={collegeFilter}
            onChange={(e) => { setCollegeFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white focus:outline-none"
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white focus:outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
        <span className="text-[10px] text-white/50">
          Showing {paginated.length} of {filtered.length} participants
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllPresent}
            disabled={participants.length > 0 && !participants.some((p) => p.verificationStatus === 'Verified')}
            title={participants.some((p) => p.verificationStatus === 'Verified') ? 'Mark all verified participants present' : 'Marking attendance is locked until participants are verified'}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark All Present
          </button>
          <button
            onClick={onClearAttendance}
            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            Clear Attendance
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-lg bg-violet-600 border border-violet-500/50 text-white text-[10px] font-bold hover:bg-violet-500 transition-all cursor-pointer"
          >
            Save Attendance
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
            <tr>
              <th className="p-3">Reg ID</th>
              <th className="p-3">Participant ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">College</th>
              <th className="p-3">Department</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Registration Status</th>
              <th className="p-3">Verification</th>
              <th className="p-3">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-xs text-white/40">
                  No matching participants found
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <AttendanceRow
                  key={p.participantId}
                  participant={p}
                  locked={p.verificationStatus !== 'Verified'}
                  isSaving={!!savingIds[p.participantId]}
                  onMarkPresent={onMarkPresent}
                  onMarkAbsent={onMarkAbsent}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, safePage - 2);
              const page = start + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    page === safePage
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
