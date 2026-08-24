import type { ReportFilters, ReportRow, ReportSummary } from './types';

/** True when the payment status means the fee has been settled. */
export function isPaidStatus(paymentStatus: string): boolean {
  const v = paymentStatus.trim().toLowerCase();
  return v === 'verified' || v === 'approved' || v === 'paid';
}

export function computeSummary(rows: ReportRow[]): ReportSummary {
  let verified = 0;
  let present = 0;
  let absent = 0;
  let paid = 0;
  rows.forEach((r) => {
    if (r.verificationStatus.toLowerCase() === 'verified') verified += 1;
    if (r.attendanceStatus === 'Present') present += 1;
    if (r.attendanceStatus === 'Absent') absent += 1;
    if (isPaidStatus(r.paymentStatus)) paid += 1;
  });
  return {
    total: rows.length,
    verified,
    notVerified: rows.length - verified,
    present,
    absent,
    paid,
    pendingPayment: rows.length - paid,
  };
}

function matchesTerm(row: ReportRow, term: string): boolean {
  const q = term.toLowerCase();
  return (
    row.fullName.toLowerCase().includes(q) ||
    row.casyumId.toLowerCase().includes(q) ||
    row.registrationId.toLowerCase().includes(q) ||
    row.rollNumber.toLowerCase().includes(q) ||
    row.email.toLowerCase().includes(q) ||
    row.phone.toLowerCase().includes(q)
  );
}

/** Applies search + every filter together. Pure function. */
export function applyReportFilters(rows: ReportRow[], filters: ReportFilters, search: string): ReportRow[] {
  const term = search.trim();
  const from = filters.registeredFrom ? filters.registeredFrom : '';
  const to = filters.registeredTo ? `${filters.registeredTo}~` : ''; // '~' sorts after any time suffix

  return rows.filter((r) => {
    if (filters.eventId && r.eventId !== filters.eventId) return false;
    if (filters.department && r.department !== filters.department) return false;
    if (filters.year && r.year !== filters.year) return false;
    if (filters.paymentStatus && r.paymentStatus.toLowerCase() !== filters.paymentStatus.toLowerCase()) return false;
    if (filters.verificationStatus && r.verificationStatus.toLowerCase() !== filters.verificationStatus.toLowerCase())
      return false;
    if (filters.attendanceStatus && r.attendanceStatus !== filters.attendanceStatus) return false;
    if (filters.eventType && r.eventType !== filters.eventType) return false;
    if (from && r.registeredAt.slice(0, 10) < from) return false;
    if (to && r.registeredAt.slice(0, 10) > to) return false;
    if (term && !matchesTerm(r, term)) return false;
    return true;
  });
}

/** Distinct sorted values actually present in the data - nothing hardcoded. */
export function uniqueValues(rows: ReportRow[], pick: (r: ReportRow) => string): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = pick(r);
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

const EVENT_TYPE_ORDER: Record<string, number> = { Regular: 0, Gaming: 1, Team: 2 };

/** Options for the Event Type filter (fixed domain of the existing schema). */
export function eventTypeOptions(): string[] {
  return Object.keys(EVENT_TYPE_ORDER);
}
