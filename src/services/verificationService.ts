import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now, nextSequence } from './helpers';

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export const VERIFICATION_REJECT_REASONS = [
  'Duplicate Registration',
  'Payment Pending',
  'Invalid College ID',
  'Wrong Event',
  'Missing Required Details',
  'Other',
] as const;

export interface VerifierInfo {
  userId: string;
  name: string;
}

export interface VerificationRecord {
  id: string;
  participant_id: string;
  participant_name: string;
  registration_id?: string;
  status: VerificationStatus;
  verified_by: string;
  verified_by_user_id: string;
  verified_at: string;
  remarks: string;
  device: string;
  created_at: string;
}

export interface VerificationLogEntry {
  id: string;
  log_id: string;
  type: 'verify' | 'reject' | 'bulk' | 'account';
  participant_id?: string;
  participant_name?: string;
  actor_id: string;
  actor_name: string;
  details: string;
  timestamp: string;
  device?: string;
  created_at: string;
}

export interface ParticipantVerificationFields {
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verifiedByUserId: string;
  verifiedAt: string;
  verificationRemarks: string;
}

function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Web';
}

async function writeVerificationLog(entry: Omit<VerificationLogEntry, 'id' | 'log_id' | 'created_at' | 'timestamp'>): Promise<void> {
  const db = getDb();
  const logId = `vlog-${String(await nextSequence('verification_logs'))}`;
  const timestamp = now();
  await setDoc(doc(db, 'verification_logs', logId), {
    log_id: logId,
    ...entry,
    timestamp,
    created_at: timestamp,
    _serverTimestamp: serverTimestamp(),
  });
}

/**
 * Verifies a single participant at the Registration Desk. Idempotent: if the
 * participant is already Verified the previous verifier data is preserved and
 * this call returns without creating a duplicate log.
 */
export async function verifyParticipant(
  participantId: string,
  verifier: VerifierInfo,
  device?: string
): Promise<{ message: string }> {
  const db = getDb();
  const ref = doc(db, 'participants', participantId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Participant not found.');
  }
  const existing = snap.data();
  if (existing.verificationStatus === 'Verified') {
    return { message: 'Participant is already verified.' };
  }

  const verifiedAt = now();
  const patch: Record<string, unknown> = {
    verificationStatus: 'Verified',
    verifiedBy: verifier.name,
    verifiedByName: verifier.name,
    verifiedByUserId: verifier.userId,
    verifiedAt,
    verificationRemarks: existing.verificationRemarks || '',
    rejectedBy: null,
    rejectedByName: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    updated_at: now(),
  };
  await updateDoc(ref, patch);

  const verificationId = `pv-${participantId}`;
  await setDoc(
    doc(db, 'participant_verifications', verificationId),
    {
      participant_id: participantId,
      participant_name: existing.full_name || '',
      registration_id: existing.registration_id || '',
      status: 'Verified',
      verified_by: verifier.name,
      verified_by_user_id: verifier.userId,
      verified_at: verifiedAt,
      remarks: '',
      device: device || getDeviceLabel(),
      timestamp: verifiedAt,
      updated_at: verifiedAt,
    },
    { merge: true }
  );

  await writeVerificationLog({
    type: 'verify',
    participant_id: participantId,
    participant_name: existing.full_name || '',
    actor_id: verifier.userId,
    actor_name: verifier.name,
    details: `Verified participant ${existing.full_name || participantId} at the Registration Desk`,
    device: device || getDeviceLabel(),
  });

  return { message: 'Participant verified successfully.' };
}

/**
 * Rejects a participant verification with a required reason. Allows the desk
 * to re-verify the participant later (status moves back to Pending/Verified).
 */
export async function rejectParticipant(
  participantId: string,
  verifier: VerifierInfo,
  reason: string,
  device?: string
): Promise<{ message: string }> {
  const db = getDb();
  const ref = doc(db, 'participants', participantId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Participant not found.');
  }
  const existing = snap.data();
  if (!reason || !reason.trim()) {
    throw new Error('A rejection reason is required.');
  }

  const rejectedAt = now();
  const trimmedReason = reason.trim();
  await updateDoc(ref, {
    verificationStatus: 'Rejected',
    verifiedBy: verifier.name,
    verifiedByName: verifier.name,
    verifiedByUserId: verifier.userId,
    verifiedAt: rejectedAt,
    verificationRemarks: trimmedReason,
    rejectedBy: verifier.name,
    rejectedByName: verifier.name,
    rejectedByUserId: verifier.userId,
    rejectedAt,
    rejectionReason: trimmedReason,
    updated_at: now(),
  });

  await setDoc(
    doc(db, 'participant_verifications', `pv-${participantId}`),
    {
      participant_id: participantId,
      participant_name: existing.full_name || '',
      registration_id: existing.registration_id || '',
      status: 'Rejected',
      verified_by: verifier.name,
      verified_by_user_id: verifier.userId,
      verified_at: rejectedAt,
      remarks: reason.trim(),
      device: device || getDeviceLabel(),
      timestamp: rejectedAt,
      updated_at: rejectedAt,
    },
    { merge: true }
  );

  await writeVerificationLog({
    type: 'reject',
    participant_id: participantId,
    participant_name: existing.full_name || '',
    actor_id: verifier.userId,
    actor_name: verifier.name,
    details: `Rejected verification for ${existing.full_name || participantId}: ${reason.trim()}`,
    device: device || getDeviceLabel(),
  });

  return { message: 'Participant verification rejected.' };
}

/**
 * Verifies many participants in one batch. Each participant is updated and
 * logged independently; failures never block the others.
 */
export async function bulkVerifyParticipants(
  participantIds: string[],
  verifier: VerifierInfo,
  device?: string
): Promise<{ verified: number; failed: number }> {
  const unique = [...new Set(participantIds.map((id) => String(id).trim()).filter(Boolean))];
  let verified = 0;
  let failed = 0;

  await Promise.all(
    unique.map(async (id) => {
      try {
        await verifyParticipant(id, verifier, device);
        verified += 1;
      } catch {
        failed += 1;
      }
    })
  );

  if (verified > 0) {
    await writeVerificationLog({
      type: 'bulk',
      actor_id: verifier.userId,
      actor_name: verifier.name,
      details: `Bulk verified ${verified} participant${verified === 1 ? '' : 's'} at the Registration Desk${failed ? ` (${failed} failed)` : ''}`,
      device: device || getDeviceLabel(),
    });
  }

  return { verified, failed };
}

export async function resetVerification(participantId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'participants', participantId), {
    verificationStatus: 'Pending',
    verifiedBy: '',
    verifiedByName: '',
    verifiedByUserId: '',
    verifiedAt: null,
    verificationRemarks: '',
    rejectedBy: null,
    rejectedByName: null,
    rejectedByUserId: null,
    rejectedAt: null,
    rejectionReason: null,
    updated_at: now(),
  });
}

export async function undoVerification(participantId: string): Promise<void> {
  await resetVerification(participantId);
}

export async function listVerificationLogs(limitCount = 500): Promise<VerificationLogEntry[]> {
  const db = getDb();
  const q = query(collection(db, 'verification_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      log_id: data.log_id || d.id,
      type: data.type || 'verify',
      participant_id: data.participant_id || '',
      participant_name: data.participant_name || '',
      actor_id: data.actor_id || '',
      actor_name: data.actor_name || '',
      details: data.details || '',
      timestamp: data.timestamp || '',
      device: data.device || '',
      created_at: data.created_at || '',
    } as VerificationLogEntry;
  });
}

export async function listParticipantVerifications(): Promise<VerificationRecord[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'participant_verifications'));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      participant_id: data.participant_id || '',
      participant_name: data.participant_name || '',
      registration_id: data.registration_id || '',
      status: (data.status || 'Pending') as VerificationStatus,
      verified_by: data.verified_by || '',
      verified_by_user_id: data.verified_by_user_id || '',
      verified_at: data.verified_at || '',
      remarks: data.remarks || '',
      device: data.device || '',
      created_at: data.created_at || '',
    } as VerificationRecord;
  });
}

export interface VerificationParticipantRow {
  id: string;
  participant_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year_of_study: string;
  register_number: string;
  payment_status: string;
  event_ids: string[];
  registrationId: string;
  eventNames: string[];
  registrationStatus: string;
  verificationStatus: VerificationStatus;
  verifiedBy: string;
  verifiedByName: string;
  verifiedByUserId: string;
  verifiedAt: string;
  rejectedBy: string;
  rejectedByName: string;
  rejectedByUserId: string;
  rejectedAt: string;
  rejectionReason: string;
  verificationRemarks: string;
}

function mapVerificationParticipant(
  id: string,
  data: any,
  regs: Array<Record<string, any>> = [],
  events: Record<string, any> = {}
): VerificationParticipantRow {
  const registration = regs[0];
  const eventIds = (data.event_ids || []).map(String);
  const eventNames = Array.from(
    new Set(regs.map((r) => events[r.event_id]?.name || '').filter(Boolean))
  );
  return {
    id,
    participant_id: id,
    full_name: data.full_name || '',
    email: data.email || '',
    phone: data.phone || '',
    college: data.college || '',
    department: data.department || '',
    year_of_study: data.year_of_study || '',
    register_number: data.register_number || '',
    payment_status: data.payment_status || 'Pending',
    event_ids: eventIds,
    registrationId: registration?.registration_id || data.registration_id || '',
    eventNames,
    registrationStatus: registration?.status || data.registrationStatus || 'Confirmed',
    verificationStatus: (data.verificationStatus || 'Pending') as VerificationStatus,
    verifiedBy: data.verifiedBy || '',
    verifiedByName: data.verifiedByName || data.verifiedBy || '',
    verifiedByUserId: data.verifiedByUserId || '',
    verifiedAt: data.verifiedAt || '',
    rejectedBy: data.rejectedBy || '',
    rejectedByName: data.rejectedByName || data.rejectedBy || '',
    rejectedByUserId: data.rejectedByUserId || '',
    rejectedAt: data.rejectedAt || '',
    rejectionReason: data.rejectionReason || data.verificationRemarks || '',
    verificationRemarks: data.verificationRemarks || '',
  };
}

async function loadVerificationLookup(): Promise<{
  regsByParticipant: Record<string, Array<Record<string, any>>>;
  events: Record<string, any>;
}> {
  const db = getDb();
  const [regSnap, eventSnap] = await Promise.all([
    getDocs(collection(db, 'registrations')),
    getDocs(collection(db, 'events')),
  ]);
  const regsByParticipant: Record<string, Array<Record<string, any>>> = {};
  regSnap.docs.forEach((d) => {
    const data = d.data();
    const pid = String(data.participant_id || data.participant_user_id || '');
    if (!pid) return;
    if (!regsByParticipant[pid]) regsByParticipant[pid] = [];
    regsByParticipant[pid].push({ ...data, registration_id: data.registration_id || d.id });
  });
  const events: Record<string, any> = {};
  eventSnap.docs.forEach((d) => {
    events[d.id] = { id: d.id, ...d.data() };
  });
  return { regsByParticipant, events };
}

export async function listVerificationParticipants(): Promise<VerificationParticipantRow[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'participants'));
  const { regsByParticipant, events } = await loadVerificationLookup();
  return snap.docs.map((d) =>
    mapVerificationParticipant(d.id, d.data(), regsByParticipant[d.id] || [], events)
  );
}

export function subscribeVerificationParticipants(
  onNext: (rows: VerificationParticipantRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  let participantsData: Record<string, any> = {};
  let regsByParticipant: Record<string, Array<Record<string, any>>> = {};
  let events: Record<string, any> = {};
  let ready = false;

  const emit = () => {
    if (!ready) return;
    const rows = Object.keys(participantsData).map((id) =>
      mapVerificationParticipant(id, participantsData[id], regsByParticipant[id] || [], events)
    );
    onNext(rows);
  };

  const unsubParticipants = onSnapshot(
    collection(db, 'participants'),
    (snapshot) => {
      participantsData = {};
      snapshot.docs.forEach((d) => {
        participantsData[d.id] = d.data();
      });
      emit();
    },
    onError
  );

  const unsubRegistrations = onSnapshot(
    collection(db, 'registrations'),
    (snapshot) => {
      regsByParticipant = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        const pid = String(data.participant_id || data.participant_user_id || '');
        if (!pid) return;
        if (!regsByParticipant[pid]) regsByParticipant[pid] = [];
        regsByParticipant[pid].push({ ...data, registration_id: data.registration_id || d.id });
      });
      emit();
    },
    onError
  );

  const unsubEvents = onSnapshot(
    collection(db, 'events'),
    (snapshot) => {
      events = {};
      snapshot.docs.forEach((d) => {
        events[d.id] = { id: d.id, ...d.data() };
      });
      emit();
    },
    onError
  );

  ready = true;
  return () => {
    ready = false;
    unsubParticipants();
    unsubRegistrations();
    unsubEvents();
  };
}

export function subscribeVerificationLogs(
  onNext: (logs: VerificationLogEntry[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  const q = query(collection(db, 'verification_logs'), orderBy('timestamp', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          log_id: data.log_id || d.id,
          type: data.type || 'verify',
          participant_id: data.participant_id || '',
          participant_name: data.participant_name || '',
          actor_id: data.actor_id || '',
          actor_name: data.actor_name || '',
          details: data.details || '',
          timestamp: data.timestamp || '',
          device: data.device || '',
          created_at: data.created_at || '',
        } as VerificationLogEntry;
      });
      onNext(logs);
    },
    onError
  );
}
