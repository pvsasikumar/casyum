import { isGamingEvent } from '../services/eventSelection';
import type { ReportRow } from './types';

/**
 * Pure join logic for the staff report: raw Firestore documents from the
 * EXISTING collections -> flat participant x registered-event rows.
 * No writes, no invented data - every field maps to something already stored.
 */

export interface ParticipantDoc {
  id: string;
  casyum_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  college?: string;
  department?: string;
  year_of_study?: string;
  register_number?: string;
  payment_status?: string;
  verificationStatus?: string;
  event_ids?: any[];
  created_at?: string;
}

export interface RegistrationDoc {
  id: string;
  participant_id?: string;
  participant_user_id?: string;
  registered_at?: string;
  created_at?: string;
  payment_status?: string;
  paymentStatus?: string;
  attendance_status?: string;
  attendanceStatus?: string;
  status?: string;
  event_ids?: any[];
  event_id?: string;
}

export interface AttendanceDoc {
  id: string;
  participant_id?: string;
  event_id?: string;
  status?: string;
}

export interface ReportEventDoc {
  id: string;
  name?: string;
  event_type?: string;
  team_event?: boolean;
  is_gaming?: boolean;
}

export function registrationParticipantId(r: RegistrationDoc): string {
  return String(r.participant_id || r.participant_user_id || String(r.id || '').replace(/^reg-/, '') || '');
}

function asIdList(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

export function eventTypeForEvent(ev: ReportEventDoc | undefined): 'Regular' | 'Gaming' | 'Team' {
  if (ev && ev.team_event === true) return 'Team';
  if (isGamingEvent(ev as any)) return 'Gaming';
  return 'Regular';
}

function displayStatus(value: string | undefined | null, fallback: string): string {
  const v = String(value || '').trim();
  if (!v) return fallback;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function normalizeAttendance(value: string | undefined | null): ReportRow['attendanceStatus'] {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'present') return 'Present';
  if (v === 'absent') return 'Absent';
  return 'Not Marked';
}

/**
 * Joins raw documents into report rows.
 *
 * @param allowedEventIds When non-null (coordinator scope) only rows for these
 *        event ids are produced - the same boundary Firestore rules enforce.
 */
export function buildReportRows(
  participants: ParticipantDoc[],
  registrations: RegistrationDoc[],
  attendance: AttendanceDoc[],
  events: ReportEventDoc[],
  allowedEventIds: string[] | null
): ReportRow[] {
  const eventMap = new Map<string, ReportEventDoc>();
  events.forEach((e) => eventMap.set(String(e.id), e));

  const regByParticipant = new Map<string, RegistrationDoc>();
  registrations.forEach((r) => {
    const pid = registrationParticipantId(r);
    if (!pid) return;
    const existing = regByParticipant.get(pid);
    if (
      !existing ||
      String(r.registered_at || r.created_at || '').localeCompare(
        String(existing.registered_at || existing.created_at || '')
      ) > 0
    ) {
      regByParticipant.set(pid, r);
    }
  });

  // Per participant+event attendance wins; the registration-level status is a
  // weak fallback for roles that cannot read the attendance collection.
  const attByKey = new Map<string, string>();
  attendance.forEach((a) => {
    const pid = String(a.participant_id || '');
    const eid = String(a.event_id || '');
    if (pid && eid && a.status) attByKey.set(`${pid}|${eid}`, String(a.status));
  });

  const allowed = allowedEventIds ? new Set(allowedEventIds.map(String)) : null;
  const rows: ReportRow[] = [];

  participants.forEach((p) => {
    const reg = regByParticipant.get(p.id);
    const memberIds = Array.from(new Set([...asIdList(reg?.event_ids), ...asIdList(p.event_ids)]));
    if (memberIds.length === 0 && reg?.event_id) memberIds.push(String(reg.event_id));

    const scoped = allowed ? memberIds.filter((id) => allowed.has(id)) : memberIds;

    scoped.forEach((eventId) => {
      const ev = eventMap.get(eventId);
      const attendanceStatus =
        attByKey.get(`${p.id}|${eventId}`) !== undefined
          ? normalizeAttendance(attByKey.get(`${p.id}|${eventId}`))
          : normalizeAttendance(reg?.attendanceStatus || reg?.attendance_status);
      rows.push({
        key: `${p.id}::${eventId}`,
        participantId: p.id,
        registrationId: reg?.id || `reg-${p.id}`,
        casyumId: String(p.casyum_id || ''),
        fullName: String(p.full_name || ''),
        rollNumber: String(p.register_number || ''),
        department: String(p.department || ''),
        year: String(p.year_of_study || ''),
        email: String(p.email || ''),
        phone: String(p.phone || ''),
        college: String(p.college || ''),
        eventId,
        eventName: String(ev?.name || eventId),
        eventType: eventTypeForEvent(ev),
        paymentStatus: displayStatus(
          reg?.paymentStatus || reg?.payment_status || p.payment_status,
          'Unknown'
        ),
        verificationStatus: displayStatus(p.verificationStatus, 'Pending'),
        attendanceStatus,
        registeredAt: String(reg?.registered_at || reg?.created_at || p.created_at || ''),
      });
    });
  });

  rows.sort(
    (a, b) =>
      b.registeredAt.localeCompare(a.registeredAt) || a.fullName.localeCompare(b.fullName)
  );
  return rows;
}
