import type { ReportRow } from './types';

export interface ReportColumn {
  header: string;
  width: number;
  get: (r: ReportRow) => string;
}

/** The single canonical column set shared by the on-screen table, XLSX and PDF. */
export const REPORT_COLUMNS: ReportColumn[] = [
  { header: 'Registration ID', width: 16, get: (r) => r.registrationId },
  { header: 'CAS ID', width: 12, get: (r) => r.casyumId },
  { header: 'Name', width: 24, get: (r) => r.fullName },
  { header: 'Roll Number', width: 14, get: (r) => r.rollNumber },
  { header: 'Department', width: 20, get: (r) => r.department },
  { header: 'Year', width: 10, get: (r) => r.year },
  { header: 'Email', width: 26, get: (r) => r.email },
  { header: 'Phone Number', width: 15, get: (r) => r.phone },
  { header: 'Registered Event', width: 26, get: (r) => r.eventName },
  { header: 'Event Type', width: 12, get: (r) => r.eventType },
  { header: 'Payment Status', width: 14, get: (r) => r.paymentStatus },
  { header: 'Verification Status', width: 16, get: (r) => r.verificationStatus },
  { header: 'Attendance Status', width: 15, get: (r) => r.attendanceStatus },
  { header: 'Registration Date', width: 19, get: (r) => formatReportDate(r.registeredAt) },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** ISO string -> "12-Aug-2026 03:45 PM" (local time); '' when unknown. */
export function formatReportDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}
