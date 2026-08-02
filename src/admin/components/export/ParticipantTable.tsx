import React, { useState, useMemo } from 'react';
import {
  Users,
  CheckCheck,
  Clock,
  LayoutGrid,
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FilterX,
} from 'lucide-react';
import type { EventItem } from '../../types';
import type { RegisteredParticipant } from '../../services/EventExportService';

interface ParticipantTableProps {
  participants: RegisteredParticipant[];
  event: EventItem | null;
  loading: boolean;
}

const PAGE_SIZE = 8;

export const ParticipantTable: React.FC<ParticipantTableProps> = ({
  participants,
  event,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    college: '',
    department: '',
    year: '',
    gender: '',
    paymentStatus: '',
    attendanceStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const collegeList = useMemo(
    () => Array.from(new Set(participants.map((p) => p.college))).sort(),
    [participants]
  );
  const deptList = useMemo(
    () => Array.from(new Set(participants.map((p) => p.department))).sort(),
    [participants]
  );
  const yearList = useMemo(
    () => Array.from(new Set(participants.map((p) => p.year))).sort(),
    [participants]
  );

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.email.toLowerCase().includes(q) &&
          !p.id.toLowerCase().includes(q) &&
          !p.city.toLowerCase().includes(q) &&
          !p.mobile.includes(q)
        )
          return false;
      }
      if (filters.college && p.college !== filters.college) return false;
      if (filters.department && p.department !== filters.department) return false;
      if (filters.year && p.year !== filters.year) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.paymentStatus && p.paymentStatus !== filters.paymentStatus) return false;
      if (filters.attendanceStatus && p.attendanceStatus !== filters.attendanceStatus) return false;
      if (filters.dateFrom && p.registrationDate < filters.dateFrom) return false;
      if (filters.dateTo && p.registrationDate > filters.dateTo) return false;
      return true;
    });
  }, [participants, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setFilters({
      college: '',
      department: '',
      year: '',
      gender: '',
      paymentStatus: '',
      attendanceStatus: '',
      dateFrom: '',
      dateTo: '',
    });
    setSearch('');
    setCurrentPage(1);
  };

  const hasFilters = Object.values(filters).some((v) => v !== '') || search !== '';

  const stat = (icon: React.ReactNode, label: string, value: string | number, color: string) => (
    <div className="rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${color} flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-white/40 truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-extrabold font-display text-white mt-0.5 tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );

  const selectClass =
    'px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[120px]';

  if (loading) {
    return (
      <div className="flex flex-col gap-5 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-zinc-950/60 border border-white/10 p-4 h-20" />
          ))}
        </div>
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const totalRegistrations = participants.length;
  const checkedIn = participants.filter((p) => p.attendanceStatus === 'Present').length;
  const pending = participants.filter((p) => p.paymentStatus === 'Pending').length;
  const availableSeats = event.maxParticipants;
  const remainingSeats = event.maxParticipants - totalRegistrations;

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stat(<Users className="w-4 h-4" />, 'Total Registrations', totalRegistrations, 'bg-violet-500/15 text-violet-400')}
        {stat(<CheckCheck className="w-4 h-4" />, 'Checked In', checkedIn, 'bg-emerald-500/15 text-emerald-400')}
        {stat(<Clock className="w-4 h-4" />, 'Pending', pending, 'bg-amber-500/15 text-amber-400')}
        {stat(<LayoutGrid className="w-4 h-4" />, 'Available Seats', availableSeats, 'bg-cyan-500/15 text-cyan-400')}
        {stat(<TrendingDown className="w-4 h-4" />, 'Remaining Seats', remainingSeats, 'bg-rose-500/15 text-rose-400')}
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search participant..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-2.5 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">College</span>
              <select
                value={filters.college}
                onChange={(e) => { setFilters((f) => ({ ...f, college: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All Colleges</option>
                {collegeList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Department</span>
              <select
                value={filters.department}
                onChange={(e) => { setFilters((f) => ({ ...f, department: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All Departments</option>
                {deptList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Year</span>
              <select
                value={filters.year}
                onChange={(e) => { setFilters((f) => ({ ...f, year: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All Years</option>
                {yearList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Gender</span>
              <select
                value={filters.gender}
                onChange={(e) => { setFilters((f) => ({ ...f, gender: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Payment</span>
              <select
                value={filters.paymentStatus}
                onChange={(e) => { setFilters((f) => ({ ...f, paymentStatus: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">Attendance</span>
              <select
                value={filters.attendanceStatus}
                onChange={(e) => { setFilters((f) => ({ ...f, attendanceStatus: e.target.value })); setCurrentPage(1); }}
                className={selectClass}
              >
                <option value="">All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Not Marked">Not Marked</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value })); setCurrentPage(1); }}
                className={selectClass + ' [color-scheme:dark]'}
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-white/30">To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value })); setCurrentPage(1); }}
                className={selectClass + ' [color-scheme:dark]'}
              />
            </div>

            {hasFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 select-none">
          <div className="p-4 rounded-full bg-white/5 border border-white/10">
            <Users className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-lg font-bold font-display text-white/50">
            {hasFilters
              ? 'No participants match your filters.'
              : 'No participants have registered for this event yet.'}
          </h3>
          <p className="text-xs text-white/30 max-w-xs text-center">
            {hasFilters
              ? 'Try adjusting or clearing your filters.'
              : 'Participants who register for this event will appear here.'}
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30 text-xs font-bold hover:bg-violet-500/25 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="p-4 whitespace-nowrap">Registration ID</th>
                  <th className="p-4 whitespace-nowrap">Participant ID</th>
                  <th className="p-4 whitespace-nowrap">Participant Name</th>
                  <th className="p-4 whitespace-nowrap">Email</th>
                  <th className="p-4 whitespace-nowrap">Phone Number</th>
                  <th className="p-4 whitespace-nowrap">College</th>
                  <th className="p-4 whitespace-nowrap">City</th>
                  <th className="p-4 whitespace-nowrap">Department</th>
                  <th className="p-4 whitespace-nowrap">Year</th>
                  <th className="p-4 whitespace-nowrap">Gender</th>
                  <th className="p-4 whitespace-nowrap">Registration Date</th>
                  <th className="p-4 whitespace-nowrap">Payment Status</th>
                  <th className="p-4 whitespace-nowrap">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pageData.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-500/5 transition-all">
                    <td className="p-4 font-mono text-violet-300 whitespace-nowrap">{p.registrationId}</td>
                    <td className="p-4 font-mono text-white/70 whitespace-nowrap">{p.id}</td>
                    <td className="p-4 font-semibold whitespace-nowrap">{p.name}</td>
                    <td className="p-4 text-white/60 whitespace-nowrap">{p.email}</td>
                    <td className="p-4 text-white/60 whitespace-nowrap font-mono text-[10px]">{p.mobile}</td>
                    <td className="p-4 text-white/70 whitespace-nowrap max-w-[150px] truncate">{p.college}</td>
                    <td className="p-4 text-white/70 whitespace-nowrap">{p.city || '—'}</td>
                    <td className="p-4 text-white/70 whitespace-nowrap">{p.department}</td>
                    <td className="p-4 text-white/60 whitespace-nowrap">{p.year}</td>
                    <td className="p-4 whitespace-nowrap">{p.gender}</td>
                    <td className="p-4 text-white/60 whitespace-nowrap">{p.registrationDate}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentStatus === 'Approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : p.paymentStatus === 'Pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.attendanceStatus === 'Present'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : p.attendanceStatus === 'Late'
                            ? 'bg-amber-500/15 text-amber-400'
                            : p.attendanceStatus === 'Absent'
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-white/5 text-white/40'
                        }`}
                      >
                        {p.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[10px] text-white/40 font-mono">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of{' '}
              {filtered.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-white/50 font-mono min-w-[80px] text-center">
                Page {safePage} of {totalPages}
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
