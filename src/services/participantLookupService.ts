import { collection, doc, getDoc, getDocs, query, where, type Firestore } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { decodeQRPayload } from '../lib/qr';
import { listRegistrationsByParticipant, listRegistrationsByEvent } from './registrationService';
import type { RegistrationRow } from './eventService';
import type { VerificationStatus } from './verificationService';

export interface RegisteredEventDetail {
  eventId: string;
  name: string;
  date: string;
  time: string;
  venue: string;
}

/**
 * Full participant profile assembled from Firestore after a QR scan / manual
 * lookup. Never reconstructed from the QR payload itself.
 */
export interface ScannedParticipant {
  id: string;
  participantId: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  city: string;
  department: string;
  yearOfStudy: string;
  registerNumber: string;
  profilePicture: string;
  registrationId: string;
  paymentStatus: string;
  paymentVerified: boolean;
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verifiedAt: string;
  rejectionReason: string;
  registrationVerificationStatus: string;
  registrationVerifiedBy: string;
  registrationVerifiedAt: string;
  attendanceEligibility: boolean;
  eventIds: string[];
  eventNames: string[];
  registrationIds: string[];
  registeredEvents: RegisteredEventDetail[];
}

function regEventIds(reg: RegistrationRow): string[] {
  if (reg.event_ids && reg.event_ids.length > 0) return reg.event_ids.map(String);
  return [String(reg.event_id || '')].filter(Boolean);
}

interface EventDetailMap {
  [eventId: string]: { name: string; date: string; time: string; venue: string };
}

function regEventNames(reg: RegistrationRow, events: EventDetailMap): string[] {
  const names: string[] = [];
  const sel = reg.selectedEvents;
  if (sel?.regular && Array.isArray(sel.regular)) {
    sel.regular.forEach((r) => {
      if (r?.eventName) names.push(String(r.eventName));
    });
  }
  if (sel?.gaming?.eventName) names.push(String(sel.gaming.eventName));
  if (names.length > 0) return names;
  const byEventId = regEventIds(reg).map((id) => events[id]?.name).filter(Boolean);
  if (byEventId.length > 0) return byEventId;
  return [];
}

async function fetchEventDetails(regs: RegistrationRow[]): Promise<EventDetailMap> {
  const db = getDb();
  const ids = [...new Set(regs.flatMap((r) => regEventIds(r)).filter(Boolean))];
  const map: EventDetailMap = {};
  await Promise.all(
    ids.map(async (id) => {
      const snap = await getDoc(doc(db, 'events', id));
      if (snap.exists()) {
        const d = snap.data();
        map[id] = {
          name: String(d.name || ''),
          date: String(d.event_date || ''),
          time: String(d.time || ''),
          venue: String(d.venue || ''),
        };
      }
    })
  );
  return map;
}

function buildProfile(
  id: string,
  data: Record<string, any>,
  regs: RegistrationRow[],
  eventDetails: EventDetailMap
): ScannedParticipant {
  const regPaymentStatuses = regs
    .map((r) => String(r.payment_status || '').toLowerCase())
    .filter((s) => s !== '');
  const paymentVerified =
    regs.length > 0 && regPaymentStatuses.length > 0 && regPaymentStatuses.every((s) => s === 'verified');

  // Registration Desk verification state, mirrored on each registration doc by
  // the desk's verification sync. All of a participant's registrations are
  // updated together, so the first is representative.
  const deskStatuses = regs
    .map((r) => String(r.registration_verification_status || 'locked').toLowerCase())
    .filter((s) => s !== '');
  const registrationVerificationStatus =
    deskStatuses.length === 0
      ? 'locked'
      : deskStatuses.every((s) => s === 'verified')
        ? 'verified'
        : deskStatuses.includes('rejected')
          ? 'rejected'
          : 'locked';

  return {
    id,
    participantId: id,
    fullName: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    college: data.college || '',
    city: data.city || '',
    department: data.department || '',
    yearOfStudy: data.year_of_study || '',
    registerNumber: data.register_number || '',
    profilePicture: data.profile_picture || data.photo || '',
    registrationId: regs[0]?.registration_id || data.registration_id || '',
    paymentStatus: regPaymentStatuses[0] || data.payment_status || 'submitted',
    paymentVerified,
    verificationStatus: (data.verificationStatus || 'Pending') as VerificationStatus,
    verifiedBy: data.verifiedBy || '',
    verifiedAt: data.verifiedAt || '',
    rejectionReason: data.rejectionReason || data.verificationRemarks || '',
    registrationVerificationStatus,
    registrationVerifiedBy: regs[0]?.registration_verified_by_name || '',
    registrationVerifiedAt: regs[0]?.registration_verified_at || '',
    attendanceEligibility: registrationVerificationStatus === 'verified' && paymentVerified,
    eventIds: [...new Set(regs.flatMap((r) => regEventIds(r)))],
    eventNames: [...new Set(regs.flatMap((r) => regEventNames(r, eventDetails)))],
    registrationIds: regs.map((r) => r.registration_id),
    registeredEvents: [...new Set(regs.flatMap((r) => regEventIds(r)))]
      .map((eventId) => {
        const detail = eventDetails[eventId];
        return detail
          ? { eventId, name: detail.name, date: detail.date, time: detail.time, venue: detail.venue }
          : null;
      })
      .filter((d): d is RegisteredEventDetail => d !== null),
  };
}

/**
 * Resolve a scanned / pasted QR payload to a participant id. Returns null when
 * the payload is not a valid CASYUM participant code.
 */
export function resolveParticipantCode(data: string): string | null {
  return decodeQRPayload(data);
}

/**
 * Fetch a participant's full profile from Firestore by its unique identifier.
 * The identifier may be a participant document id, a registration id, or the
 * content decoded from a CASYUM QR code.
 *
 * When `eventId` is provided the registration lookup is scoped to that event
 * only (required by Firestore rules: coordinators may only read registrations
 * for their assigned event).
 */
export async function getScannedParticipant(
  identifier: string,
  opts?: { eventId?: string }
): Promise<ScannedParticipant | null> {
  const key = String(identifier || '').trim();
  if (!key) return null;

  const db = getDb();
  const id = await resolveParticipantKey(db, key);
  if (!id) return null;

  const snap = await getDoc(doc(db, 'participants', id));
  if (!snap.exists()) return null;
  const data = snap.data();

  let regs: RegistrationRow[] = [];
  if (opts?.eventId) {
    const eventRegs = await listRegistrationsByEvent(opts.eventId).catch(() => [] as RegistrationRow[]);
    regs = eventRegs.filter(
      (r) => r.participant_id === id || r.participant_user_id === id || r.registration_id === key
    );
  } else {
    regs = await listRegistrationsByParticipant(id).catch(() => [] as RegistrationRow[]);
  }
  const eventDetails = await fetchEventDetails(regs);

  return buildProfile(id, data, regs, eventDetails);
}

/**
 * Manual fallback search used by Event Coordinators when the camera is
 * unavailable. Searches the event's registrations by name, email, phone or
 * registration id (all fields the coordinator is allowed to read), then
 * resolves the full profile through the same server-side lookup as a scan.
 */
export async function searchEventParticipant(
  eventId: string,
  queryText: string
): Promise<ScannedParticipant | null> {
  const q = String(queryText || '').trim().toLowerCase();
  if (!q) return null;

  const regs = await listRegistrationsByEvent(eventId).catch(() => [] as RegistrationRow[]);
  const match = regs.find(
    (r) =>
      String(r.user_full_name || '').toLowerCase().includes(q) ||
      String(r.participant_email || '').toLowerCase().includes(q) ||
      String(r.user_phone || '').toLowerCase().includes(q) ||
      String(r.registration_id || '').toLowerCase().includes(q)
  );
  if (!match) return null;

  const participantId = String(match.participant_user_id || match.participant_id || '');
  if (!participantId) return null;
  return getScannedParticipant(participantId, { eventId });
}

async function resolveParticipantKey(db: Firestore, key: string): Promise<string | null> {
  const direct = await getDoc(doc(db, 'participants', key));  if (direct.exists()) return key;

  try {
    const byRegId = await getDocs(
      query(collection(db, 'registrations'), where('registration_id', '==', key), where('participant_id', '!=', ''))
    );
    const first = byRegId.docs.find((d) => {
      const pid = String(d.data().participant_id || '');
      return pid.length > 0;
    });
    if (first) return String(first.data().participant_id || '');
  } catch {
    // rules may restrict this lookup — continue to next fallback
  }

  try {
    const byLegacyRegId = await getDocs(
      query(collection(db, 'eventRegistrations'), where('registration_id', '==', key))
    );
    const legacy = byLegacyRegId.docs.find((d) => String(d.data().participant_id || '').length > 0);
    if (legacy) return String(legacy.data().participant_id || '');
  } catch {
    // rules may restrict this lookup — continue to next fallback
  }

  try {
    const byParticipantId = await getDocs(
      query(collection(db, 'registrations'), where('participant_id', '==', key))
    );
    const byPid = byParticipantId.docs.find((d) => String(d.data().participant_id || '').length > 0);
    if (byPid) return String(byPid.data().participant_id || '');
  } catch {
    // rules may restrict this lookup — ignore
  }

  return null;
}
