import React, { useState } from 'react';
import { Filter, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterValues {
  eventId: string;
  college: string;
  department: string;
  registrationStatus: string;
  paymentStatus: string;
  attendanceStatus: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterValues = {
  eventId: '',
  college: '',
  department: '',
  registrationStatus: '',
  paymentStatus: '',
  attendanceStatus: '',
  dateFrom: '',
  dateTo: '',
};

interface ExportFiltersProps {
  events: { id: string; name: string }[];
  colleges: string[];
  departments: string[];
  onApply: (filters: FilterValues) => void;
}

export const ExportFilters: React.FC<ExportFiltersProps> = ({
  events,
  colleges,
  departments,
  onApply,
}) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const update = (key: keyof FilterValues, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onApply(next);
  };

  const reset = () => {
    setFilters(defaultFilters);
    onApply(defaultFilters);
  };

  return (
    <div className="rounded-2xl bg-zinc-950/40 border border-white/[0.06] backdrop-blur-md overflow-hidden transition-all">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-violet-400" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[9px] font-bold">
              Active
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-white/40" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/40" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
            <select
              value={filters.eventId}
              onChange={(e) => update('eventId', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <select
              value={filters.college}
              onChange={(e) => update('college', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Colleges</option>
              {colleges.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filters.department}
              onChange={(e) => update('department', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={filters.registrationStatus}
              onChange={(e) => update('registrationStatus', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">Reg. Status: All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={filters.paymentStatus}
              onChange={(e) => update('paymentStatus', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">Payment: All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={filters.attendanceStatus}
              onChange={(e) => update('attendanceStatus', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50"
            >
              <option value="">Attendance: All</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => update('dateFrom', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
              placeholder="From date"
            />

            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => update('dateTo', e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-[11px] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
              placeholder="To date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
