import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';

export interface AttendanceRecordRow {
  id: string;
  attendance_id: string;
  event_id: string;
  participant_id: string;
  casyum_id?: string;
  coordinator_id: string;
  status: 'Present' | 'Absent';
  check_in_time: string | null;
  remarks: string;
  updated_at: string;
}

// Deterministic document id so one participant + event always maps to a single
// attendance document. setDoc becomes an idempotent upsert with no read needed.
export function attendanceDocId(eventId: string, participantId: string): string {
  return `att-${eventId}-${participantId}`;
}

export async function listAllAttendance(): Promise<AttendanceRecordRow[]> {
  const db = getDb();
  const snap = await getDocs(collection(db, 'attendance'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
}

export async function listAttendanceByEvent(eventId: string): Promise<AttendanceRecordRow[]> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'attendance'), where('event_id', '==', eventId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
}

/**
 * Look up a single attendance record for one participant + event. Implemented
 * as a query (not `getDoc`) so it stays safe under the Firestore read rules:
 * rules are only evaluated against documents that already exist, so this never
 * dereferences a null `resource` when the document has not been created yet.
 */
export async function getAttendanceByEventAndParticipant(
  eventId: string,
  participantId: string
): Promise<AttendanceRecordRow | null> {
  const db = getDb();
  const snap = await getDocs(
    query(
      collection(db, 'attendance'),
      where('event_id', '==', eventId),
      where('participant_id', '==', participantId)
    )
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as any;
}

/**
 * Duplicate-safe attendance write used by the Event Coordinator scan flow.
 *
 * The attendance document id is deterministic (`att-<eventId>-<participantId>`),
 * so a participant + event always maps to a single document — a second scan can
 * never create a duplicate record. When the record already exists the existing
 * document is returned untouched (the caller shows "Already Checked In").
 *
 * The write is awaited before any success is shown to the user.
 */
export async function markAttendance(record: {
  event_id: string;
  participant_id: string;
  casyum_id?: string;
  coordinator_id: string;
}): Promise<{ created: boolean; existing: AttendanceRecordRow | null }> {
  const existing = await getAttendanceByEventAndParticipant(
    record.event_id,
    record.participant_id
  );
  if (existing) {
    return { created: false, existing };
  }

  const db = getDb();
  const id = attendanceDocId(record.event_id, record.participant_id);
  const nowIso = now();
  const row: AttendanceRecordRow = {
    id,
    attendance_id: id,
    event_id: record.event_id,
    participant_id: record.participant_id,
    casyum_id: record.casyum_id || '',
    coordinator_id: record.coordinator_id,
    status: 'Present',
    check_in_time: nowIso,
    remarks: '',
    updated_at: nowIso,
  };
  // Keep the existing field naming conventions used by every attendance reader
  // and also store the requested `attendance_status` / `checked_in_at` fields.
  await setDoc(doc(db, 'attendance', id), {
    ...row,
    attendance_status: 'Present',
    checked_in_at: serverTimestamp(),
  });
  return { created: true, existing: null };
}

// Firestore real-time listener for all attendance records (CASYUM Faculty
// Manager overview).
export function subscribeAllAttendance(
  onNext: (rows: AttendanceRecordRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    collection(db, 'attendance'),
    (snapshot: QuerySnapshot<DocumentData>) => {
      onNext(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as any));
    },
    onError
  );
}

// Firestore real-time listener for a single event's attendance records.
export function subscribeAttendanceByEvent(
  eventId: string,
  onNext: (rows: AttendanceRecordRow[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  const q = query(collection(db, 'attendance'), where('event_id', '==', eventId));
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      onNext(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as any));
    },
    onError
  );
}

export async function setEventAttendanceLocked(eventId: string, locked: boolean): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'events', eventId), {
    attendance_locked: locked,
    updated_at: now(),
  });
}

export async function getEventAttendanceLocked(eventId: string): Promise<boolean> {
  const db = getDb();
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? snap.data().attendance_locked === true : false;
}

export async function upsertAttendance(record: {
  event_id: string;
  participant_id: string;
  casyum_id?: string;
  coordinator_id: string;
  status: 'Present' | 'Absent';
  check_in_time?: string | null;
  remarks?: string;
}): Promise<void> {
  const db = getDb();
  // Deterministic document id keeps attendance unique per participant + event.
  // A CASYUM id is 1:1 with a participant, so this also guarantees uniqueness
  // per `casyum_id + event_id` while still recording the casyum_id itself.
  const id = attendanceDocId(record.event_id, record.participant_id);
  const row: AttendanceRecordRow = {
    id,
    attendance_id: id,
    event_id: record.event_id,
    participant_id: record.participant_id,
    casyum_id: record.casyum_id || '',
    coordinator_id: record.coordinator_id,
    status: record.status,
    check_in_time: record.check_in_time ?? null,
    remarks: record.remarks || '',
    updated_at: now(),
  };
  await setDoc(doc(db, 'attendance', id), row);
}

export async function clearAttendanceByEvent(eventId: string): Promise<void> {
  const db = getDb();
  const snap = await getDocs(
    query(collection(db, 'attendance'), where('event_id', '==', eventId))
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(doc(db, 'attendance', d.id)));
  await batch.commit();
}

export async function saveAttendanceBatch(
  records: Array<{ participant_id: string; status: 'Present' | 'Absent' }>,
  eventId: string,
  coordinatorId: string
): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  const nowIso = now();
  // Blind batch.set replaces the whole document, so load existing casyum_id
  // values first to avoid wiping them when re-marking participants.
  const existing = new Map<string, string>();
  const existingSnap = await getDocs(
    query(collection(db, 'attendance'), where('event_id', '==', eventId))
  );
  existingSnap.docs.forEach((d) => {
    const row = d.data();
    if (row.casyum_id) existing.set(String(row.participant_id || ''), String(row.casyum_id));
  });
  records.forEach((r) => {
    const id = attendanceDocId(eventId, r.participant_id);
    const row: AttendanceRecordRow = {
      id,
      attendance_id: id,
      event_id: eventId,
      participant_id: r.participant_id,
      casyum_id: existing.get(r.participant_id) || '',
      coordinator_id: coordinatorId,
      status: r.status,
      check_in_time: r.status === 'Present' ? nowIso : null,
      remarks: '',
      updated_at: nowIso,
    };
    batch.set(doc(db, 'attendance', id), row);
  });
  await batch.commit();
}
