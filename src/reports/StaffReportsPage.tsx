import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useStaffReportData } from './useStaffReportData';
import {
  applyReportFilters,
  computeSummary,
  eventTypeOptions,
  uniqueValues,
} from './reportFiltering';
import { exportReportToExcel } from './excelExport';
import { exportReportToPdf } from './pdfExport';
import type { ExportMeta, ReportFilters, ReportScope } from './types';
import { EMPTY_FILTERS } from './types';

interface StaffReportsPageProps {
  scope: ReportScope;
}

function statusPillClass(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === 'verified' || v === 'approved' || v === 'paid' || v === 'present')
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (v === 'pending' || v === 'submitted' || v === 'not verified')
    return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  if (v === 'rejected' || v === 'absent')
    return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
  return 'bg-white/5 text-white/50 border-white/15';
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusPillClass(value)}`}
    >
      {value}
    </span>
  );
}

function buildFilterSummary(filters: ReportFilters, eventName: string): string {
  const parts: string[] = [eventName || 'All Events'];
  if (filters.department) parts.push(`Dept: ${filters.department}`);
  if (filters.year) parts.push(`Year: ${filters.year}`);
  if (filters.paymentStatus) parts.push(`Payment: ${filters.paymentStatus}`);
  if (filters.verificationStatus) parts.push(`Verification: ${filters.verificationStatus}`);
  if (filters.attendanceStatus) parts.push(`Attendance: ${filters.attendanceStatus}`);
  if (filters.eventType) parts.push(`Type: ${filters.eventType}`);
  if (filters.registeredFrom) parts.push(`From: ${filters.registeredFrom}`);
  if (filters.registeredTo) parts.push(`To: ${filters.registeredTo}`);
  return parts.join('   |   ');
}

const selectClass =
  'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/85 [color-scheme:dark] focus:outline-none focus:border-violet-500/60 cursor-pointer';

const SUMMARY_CARDS = [
  { key: 'total', label: 'Total Registrations', accent: 'text-violet-400' },
  { key: 'verified', label: 'Verified', accent: 'text-emerald-400' },
  { key: 'notVerified', label: 'Not Verified', accent: 'text-amber-400' },
  { key: 'paid', label: 'Paid', accent: 'text-emerald-400' },
  { key: 'pendingPayment', label: 'Pending Payment', accent: 'text-amber-400' },
  { key: 'present', label: 'Present', accent: 'text-emerald-400' },
  { key: 'absent', label: 'Absent', accent: 'text-rose-400' },
] as const;

export default function StaffReportsPage({ scope }: StaffReportsPageProps) {
  const { rows, events, loading, error } = useStaffReportData(scope);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ReportFilters>(EMPTY_FILTERS);

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const departmentOptions = useMemo(() => uniqueValues(rows, (r) => r.department), [rows]);
  const yearOptions = useMemo(() => uniqueValues(rows, (r) => r.year), [rows]);
  const paymentOptions = useMemo(() => uniqueValues(rows, (r) => r.paymentStatus), [rows]);
  const verificationOptions = useMemo(
    () => uniqueValues(rows, (r) => r.verificationStatus),
    [rows]
  );

  const visibleRows = useMemo(
    () => applyReportFilters(rows, filters, search),
    [rows, filters, search]
  );
  const summary = useMemo(() => computeSummary(visibleRows), [visibleRows]);

  const selectedEventName =
    filters.eventId ? events.find((e) => e.id === filters.eventId)?.name || '' : '';

  const exportMeta: ExportMeta = useMemo(
    () => ({
      eventName: selectedEventName || 'All Events',
      filterSummary: buildFilterSummary(filters, selectedEventName || 'All Events'),
      filters,
    }),
    [selectedEventName, filters] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">Participant Report</h1>
          <p className="text-sm text-white/50 mt-1">
            Live registration, verification, payment and attendance data across events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportReportToExcel(visibleRows, exportMeta)}
            disabled={visibleRows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => void exportReportToPdf(visibleRows, summary, exportMeta)}
            disabled={visibleRows.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-300">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.key} className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-1">
            <span className={`text-2xl font-extrabold font-display ${card.accent}`}>
              {summary[card.key].toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, CAS ID, roll number, email, phone..."
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60"
              />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Event</label>
            <select
              className={selectClass}
              value={filters.eventId}
              onChange={(e) => setFilter('eventId', e.target.value)}
            >
              <option value="">All Events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Department</label>
            <select
              className={selectClass}
              value={filters.department}
              onChange={(e) => setFilter('department', e.target.value)}
            >
              <option value="">All Departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Year</label>
            <select
              className={selectClass}
              value={filters.year}
              onChange={(e) => setFilter('year', e.target.value)}
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-36">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Payment</label>
            <select
              className={selectClass}
              value={filters.paymentStatus}
              onChange={(e) => setFilter('paymentStatus', e.target.value)}
            >
              <option value="">All Payments</option>
              {paymentOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Verification</label>
            <select
              className={selectClass}
              value={filters.verificationStatus}
              onChange={(e) => setFilter('verificationStatus', e.target.value)}
            >
              <option value="">All Verification</option>
              {verificationOptions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-36">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Attendance</label>
            <select
              className={selectClass}
              value={filters.attendanceStatus}
              onChange={(e) => setFilter('attendanceStatus', e.target.value as ReportFilters['attendanceStatus'])}
            >
              <option value="">All Attendance</option>
              {['Present', 'Absent', 'Not Marked'].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-32">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Event Type</label>
            <select
              className={selectClass}
              value={filters.eventType}
              onChange={(e) => setFilter('eventType', e.target.value as ReportFilters['eventType'])}
            >
              <option value="">All Types</option>
              {eventTypeOptions().map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Registered From</label>
            <input
              type="date"
              className={`${selectClass} w-full sm:w-40`}
              value={filters.registeredFrom}
              max={filters.registeredTo || undefined}
              onChange={(e) => setFilter('registeredFrom', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/40">Registered To</label>
            <input
              type="date"
              className={`${selectClass} w-full sm:w-40`}
              value={filters.registeredTo}
              min={filters.registeredFrom || undefined}
              onChange={(e) => setFilter('registeredTo', e.target.value)}
            />
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <span className="text-xs font-bold text-white">
            Registration Records ({visibleRows.length.toLocaleString()})
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            of {rows.length.toLocaleString()} total
          </span>
        </div>
        <div className="overflow-x-auto max-h-[62vh] overflow-y-auto">
          <table className="w-full min-w-[1400px] text-left">
            <thead className="sticky top-0 z-10 bg-zinc-950">
              <tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-white/40">
                {[
                  'Registration ID', 'CAS ID', 'Name', 'Roll Number', 'Department', 'Year',
                  'Email', 'Phone Number', 'Registered Event', 'Event Type', 'Payment Status',
                  'Verification Status', 'Attendance Status', 'Registration Date',
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.key} className="border-b border-white/5 hover:bg-violet-500/[0.06] transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-[10px] font-mono text-white/45">{row.registrationId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[11px] font-mono font-bold text-violet-300">{row.casyumId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-bold text-white">{row.fullName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/60">{row.rollNumber || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/60">{row.department || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/60">{row.year || '-'}</td>
                  <td className="px-4 py-3 text-xs text-white/60">{row.email || '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/60">{row.phone || '-'}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-white/85">{row.eventName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-white/60">{row.eventType}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusPill value={row.paymentStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusPill value={row.verificationStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusPill value={row.attendanceStatus} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-[10px] text-white/40">
                    {row.registeredAt ? new Date(row.registeredAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-5 py-12 text-center text-xs text-white/40">
                    No participants match the current search or filters. Adjust the criteria and try again.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
