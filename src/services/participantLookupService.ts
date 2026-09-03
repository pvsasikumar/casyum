import { collection, doc, getDoc, getDocs, query, where, type Firestore } from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { decodeParticipantQR, decodeQRPayload, normalizeCasyumQrValue } from '../lib/qr';
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
  casyumId: string;
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
  payment_screenshot_url: string;
  payment_screenshot_file_id: string;
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
    casyumId: String(data.casyum_id || ''),
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
    payment_screenshot_url: data.payment_screenshot_url || '',
    payment_screenshot_file_id: data.payment_screenshot_file_id || '',
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
 * Resolve a CASYUM id (`CAS00`) to the participant document id via the
 * `casyum_id` field: `participants where casyum_id == "CAS00"`. The scanned
 * value is never used as a document id for this path.
 */
async function resolveByCasyumId(db: Firestore, casyumId: string): Promise<string | null> {
  const id = String(casyumId || '').trim().toUpperCase();
  if (!/^CAS-?\d+$/i.test(id)) return null;
  try {
    const snap = await getDocs(query(collection(db, 'participants'), where('casyum_id', '==', id)));
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch (err: any) {
    console.warn('[CASYUM:SCAN] casyum_id query skipped', {
      casyumId: id,
      error: String(err?.message || err),
    });
    return null;
  }
}

/**
 * Shared participant lookup used by BOTH camera scans and manual entry. It
 * normalizes any raw value (bare id, prefixed QR payload, whitespace/newline
 * artifacts, lower-case) to the canonical CASYUM id (`CAS00`) and resolves it
 * through the exact same Firestore path the working manual lookup uses
 * (`participants where casyum_id == "CAS00"`). Returns null for payloads that
 * do not contain a valid CASYUM id (`^CAS-?\d+$`).
 */
export async function lookupParticipantByCasyumId(
  casyumId: string,
  opts?: { eventId?: string }
): Promise<ScannedParticipant | null> {
  const id = normalizeCasyumQrValue(casyumId);
  if (!id) return null;
  return getScannedParticipant(id, opts);
}

/**
 * Fetch a participant's full profile from Firestore by its unique identifier.
 * The identifier may be a CASYUM id / participant document id, a registration
 * id, or the content decoded from a CASYUM QR code.
 *
 * Participant-id QR payloads (`CASYUM:PARTICIPANT:<casyumId>`) are resolved
 * against the `casyum_id` field of the `participants` collection
 * (`participants where casyum_id == "CAS00"`) — never as a document id — with
 * a legacy fallback to `participants/<casyumId>` so QRs printed before the
 * CASYUM id system keep working. Registration tokens are only searched for
 * when the decoded payload is confirmed to be a registration id (legacy
 * `CASYUM:REG:` / `casyum:reg:` / `REG-*` codes).
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

  const participantId = decodeParticipantQR(key);
  const isParticipantCode = participantId !== null;
  let resolvedId: string | null = null;

  if (isParticipantCode) {
    // Canonical path: the payload suffix is a CASYUM id (`CAS00`) resolved via
    // the `casyum_id` field query. Fall back to the document id only for
    // legacy QRs that encoded the raw participant id.
    resolvedId = await resolveByCasyumId(db, participantId);
    if (!resolvedId) {
      const direct = await getDoc(doc(db, 'participants', participantId)).catch(() => null);
      if (direct?.exists()) resolvedId = participantId;
    }
  } else if (/^CAS-?\d+$/i.test(key)) {
    // Manual entry of a bare CASYUM id (e.g. typed into the desk search box).
    resolvedId = (await resolveByCasyumId(db, key)) || (await resolveParticipantKey(db, key));
  } else {
    resolvedId = await resolveParticipantKey(db, key);
  }

  if (!resolvedId) {
    console.warn('[CASYUM:SCAN] lookup did not resolve to a participant', {
      identifier: key,
      decodedId: decodeQRPayload(key),
      isParticipantCode,
    });
    return null;
  }

  const id = resolvedId;
  const participantPath = `participants/${id}`;
  console.info('[CASYUM:SCAN] participant document path', {
    collection: 'participants',
    docId: id,
    path: participantPath,
    resolvedFrom: isParticipantCode ? 'participant-id QR' : 'legacy registration token',
  });

  const snap = await getDoc(doc(db, 'participants', id));
  if (!snap.exists()) {
    console.warn('[CASYUM:SCAN] participant document not found', {
      collection: 'participants',
      docId: id,
      path: participantPath,
      identifier: key,
    });
    return null;
  }
  const data = snap.data();
  console.info('[CASYUM:SCAN] participant document found', {
    collection: 'participants',
    docId: id,
    path: participantPath,
    participantId: id,
    found: true,
  });

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

  const paymentStatuses = regs
    .map((r) => String(r.payment_status || '').toLowerCase())
    .filter((s) => s !== '');
  console.info('[CASYUM:SCAN] registrations loaded', {
    participantId: id,
    count: regs.length,
    registrationIds: regs.map((r) => r.registration_id),
    paymentStatuses,
    paymentVerified: regs.length > 0 && paymentStatuses.length > 0 && paymentStatuses.every((s) => s === 'verified'),
    eventIds: [...new Set(regs.flatMap((r) => regEventIds(r)))],
  });

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

interface RegistrationMatch {
  participantId: string;
  registrationId: string;
  collection: string;
  docId: string;
  field: string;
}

/** Field + collection pairs searched when resolving a registration token. */
const REGISTRATION_LOOKUP_CANDIDATES: Array<[string, string]> = [
  ['registrations', 'registration_id'],
  ['registrations', 'registrationId'],
  ['eventRegistrations', 'registration_id'],
  ['eventRegistrations', 'registrationId'],
];

function readParticipantId(data: Record<string, any>): string {
  return String(data.participant_id || data.participant_user_id || '').trim();
}

function readStoredRegistrationId(data: Record<string, any>, docId: string): string {
  return String(data.registration_id || data.registrationId || docId || '');
}

async function findRegistrationByField(
  db: Firestore,
  field: string,
  value: string
): Promise<RegistrationMatch | null> {
  for (const [collectionName, candidateField] of REGISTRATION_LOOKUP_CANDIDATES) {
    if (candidateField !== field) continue;
    try {
      const snap = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
      const match = snap.docs.find((d) => readParticipantId(d.data()).length > 0);
      if (match) {
        const data = match.data();
        const participantId = readParticipantId(data);
        const storedRegistrationId = readStoredRegistrationId(data, match.id);
        console.info('[CASYUM:SCAN] registration matched by field', {
          collection: collectionName,
          field,
          value,
          docId: match.id,
          participantId,
          storedRegistrationId,
        });
        return { participantId, registrationId: storedRegistrationId, collection: collectionName, docId: match.id, field };
      }
    } catch (err: any) {
      // Rules or a missing index may reject this query — try the next pair.
      console.warn('[CASYUM:SCAN] registration query skipped', {
        collection: collectionName,
        field,
        value,
        error: String(err?.message || err),
      });
    }
  }
  return null;
}

async function findRegistrationByFieldInAllCollections(
  db: Firestore,
  key: string
): Promise<RegistrationMatch | null> {
  const fields = [...new Set(REGISTRATION_LOOKUP_CANDIDATES.map(([, field]) => field))];
  for (const field of fields) {
    const match = await findRegistrationByField(db, field, key);
    if (match) return match;
  }
  return null;
}

async function findRegistrationByDocId(db: Firestore, key: string): Promise<RegistrationMatch | null> {
  for (const collectionName of ['registrations', 'eventRegistrations']) {
    try {
      const snap = await getDoc(doc(db, collectionName, key));
      if (snap.exists()) {
        const data = snap.data();
        const participantId = readParticipantId(data);
        if (participantId) {
          const storedRegistrationId = readStoredRegistrationId(data, snap.id);
          console.info('[CASYUM:SCAN] registration matched by document id', {
            collection: collectionName,
            docId: snap.id,
            participantId,
            storedRegistrationId,
          });
          return {
            participantId,
            registrationId: storedRegistrationId,
            collection: collectionName,
            docId: snap.id,
            field: 'documentId',
          };
        }
      }
    } catch (err: any) {
      console.warn('[CASYUM:SCAN] registration document read skipped', {
        collection: collectionName,
        docId: key,
        error: String(err?.message || err),
      });
    }
  }
  return null;
}

async function resolveParticipantKey(db: Firestore, key: string): Promise<string | null> {
  console.info('[CASYUM:SCAN] resolving participant key', { key });

  // 1. The scanned token may itself be a participant document id.
  try {
    const direct = await getDoc(doc(db, 'participants', key));
    if (direct.exists()) {
      console.info('[CASYUM:SCAN] resolved directly as participant document id', { participantId: key });
      return key;
    }
  } catch (err: any) {
    console.warn('[CASYUM:SCAN] participant document read skipped', {
      docId: key,
      error: String(err?.message || err),
    });
  }

  // 2. The scanned token may be a registration document id (e.g. REG-22).
  const byDocId = await findRegistrationByDocId(db, key);
  if (byDocId) return byDocId.participantId;

  // 3. Match the token against the stored registration-id fields in both the
  //    `registrations` (legacy) and `eventRegistrations` (canonical) collections,
  //    trying both the snake_case and camelCase field names.
  const byField = await findRegistrationByFieldInAllCollections(db, key);
  if (byField) return byField.participantId;

  // 4. Case-insensitive fallback for REG- tokens (Firestore equality is
  //    case-sensitive, but the parser already canonicalizes the prefix).
  if (/^reg-/i.test(key)) {
    const upperKey = key.toUpperCase();
    if (upperKey !== key) {
      const byUpper = await findRegistrationByFieldInAllCollections(db, upperKey);
      if (byUpper) return byUpper.participantId;
    }
  }

  // 5. Legacy fallback: the scanned token may itself be a participant id.
  try {
    const byParticipantId = await getDocs(
      query(collection(db, 'registrations'), where('participant_id', '==', key))
    );
    const byPid = byParticipantId.docs.find((d) => readParticipantId(d.data()).length > 0);
    if (byPid) return readParticipantId(byPid.data());
  } catch (err: any) {
    console.warn('[CASYUM:SCAN] participant-id query skipped', {
      key,
      error: String(err?.message || err),
    });
  }

  console.warn('[CASYUM:SCAN] no registration or participant matched the token', { key });
  return null;
}
