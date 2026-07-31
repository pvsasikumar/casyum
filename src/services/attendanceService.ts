import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '../firebase/firestore';
import { now } from './helpers';

export interface AttendanceRecordRow {
  id: string;
  attendance_id: string;
  event_id: string;
  participant_id: string;
  coordinator_id: string;
  status: 'Present' | 'Absent';
  check_in_time: string | null;
  remarks: string;
  updated_at: string;
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
  coordinator_id: string;
  status: 'Present' | 'Absent';
  check_in_time?: string | null;
  remarks?: string;
}): Promise<void> {
  const db = getDb();
  const existing = await listAttendanceByEvent(record.event_id);
  const found = existing.find((a) => a.participant_id === record.participant_id);
  if (found) {
    await updateDoc(doc(db, 'attendance', found.id), {
      status: record.status,
      check_in_time: record.check_in_time ?? null,
      remarks: record.remarks || found.remarks || '',
      updated_at: now(),
    });
    return;
  }
  const row: AttendanceRecordRow = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    attendance_id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event_id: record.event_id,
    participant_id: record.participant_id,
    coordinator_id: record.coordinator_id,
    status: record.status,
    check_in_time: record.check_in_time ?? null,
    remarks: record.remarks || '',
    updated_at: now(),
  };
  await setDoc(doc(db, 'attendance', row.attendance_id), row);
}

export async function clearAttendanceByEvent(eventId: string): Promise<void> {
  const db = getDb();
  const existing = await listAttendanceByEvent(eventId);
  await Promise.all(existing.map((a) => deleteDoc(doc(db, 'attendance', a.id))));
}

export async function saveAttendanceBatch(
  records: Array<{ participant_id: string; status: 'Present' | 'Absent' }>,
  eventId: string,
  coordinatorId: string
): Promise<void> {
  for (const r of records) {
    await upsertAttendance({
      event_id: eventId,
      participant_id: r.participant_id,
      coordinator_id: coordinatorId,
      status: r.status,
      check_in_time: r.status === 'Present' ? new Date().toISOString() : null,
    });
  }
}
