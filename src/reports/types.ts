/**
 * Shared CASYUM Staff Reports / Export system.
 *
 * One unified participant report (search + filters + summary + PDF/Excel
 * export) reused by every authorized staff portal. Data always comes from the
 * existing Firestore collections (participants / registrations /
 * eventRegistrations / attendance / events) — no duplicate data is created.
 */

/** A single participant × registered-event row in the report table. */
export interface ReportRow {
  /** Stable row key: `${participantId}::${eventId}`. */
  key: string;
  participantId: string;
  registrationId: string;
  casyumId: string;
  fullName: string;
  rollNumber: string;
  department: string;
  year: string;
  email: string;
  phone: string;
  college: string;
  eventId: string;
  eventName: string;
  /** Regular | Gaming | Team — derived from the existing event document. */
  eventType: 'Regular' | 'Gaming' | 'Team';
  /** Payment status exactly as stored on the registration document. */
  paymentStatus: string;
  /** Desk verification status from the participant document. */
  verificationStatus: string;
  /** Present | Absent | Not Marked. */
  attendanceStatus: 'Present' | 'Absent' | 'Not Marked';
  /** ISO timestamp of the registration. */
  registeredAt: string;
}

export interface ReportFilters {
  eventId: string; // '' = All Events
  department: string;
  year: string;
  paymentStatus: string;
  verificationStatus: string;
  attendanceStatus: string;
  eventType: string;
  registeredFrom: string; // yyyy-mm-dd
  registeredTo: string; // yyyy-mm-dd
}

export const EMPTY_FILTERS: ReportFilters = {
  eventId: '',
  department: '',
  year: '',
  paymentStatus: '',
  verificationStatus: '',
  attendanceStatus: '',
  eventType: '',
  registeredFrom: '',
  registeredTo: '',
};

export interface ReportSummary {
  total: number;
  verified: number;
  notVerified: number;
  present: number;
  absent: number;
  paid: number;
  pendingPayment: number;
}

/**
 * Data scope for a portal.
 *  - full        : every collection read is already permitted by Firestore
 *                  rules for this role (Admin, Faculty Coordinator, Observer,
 *                  Registration Team).
 *  - assigned    : Event Coordinator — only their assigned event(s). Queries
 *                  are constrained per event id so they stay rule-safe and
 *                  cannot be widened from the client.
 */
export type ReportScope = { mode: 'full' } | { mode: 'assigned'; eventIds: string[] };

export interface ReportEventOption {
  id: string;
  name: string;
}

export interface ExportMeta {
  /** Event display name for the file name + PDF header ('All Events' when unfiltered). */
  eventName: string;
  /** One-line human summary of active filters shown in exports. */
  filterSummary: string;
  /** Active filters (drive file-name suffixes). */
  filters: ReportFilters;
}
