import type {
  CoordinatorAttendanceRecord,
  ParticipantAttendanceView,
  EventAttendanceStats,
  EventParticipant,
} from '../types';
import type { AttendanceRecordRow } from '../../services/attendanceService';
import { ParticipantService } from './ParticipantService';
import {
  upsertAttendance,
  clearAttendanceByEvent,
  saveAttendanceBatch as saveFirestoreBatch,
  listAttendanceByEvent,
} from '../../services/attendanceService';

const COORDINATOR_ATTENDANCE_KEY = 'casyum_coordinator_attendance';
const CLEARED_FLAG_PREFIX = 'casyum_attendance_cleared_';

function isCleared(eventId: string): boolean {
  return localStorage.getItem(CLEARED_FLAG_PREFIX + eventId) !== null;
}

function markCleared(eventId: string): void {
  localStorage.setItem(CLEARED_FLAG_PREFIX + eventId, String(Date.now()));
}

function clearClearedFlag(eventId: string): void {
  localStorage.removeItem(CLEARED_FLAG_PREFIX + eventId);
}

function getStoredAttendance(): CoordinatorAttendanceRecord[] {
  const saved = localStorage.getItem(COORDINATOR_ATTENDANCE_KEY);
  try {
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAttendance(records: CoordinatorAttendanceRecord[]): void {
  localStorage.setItem(COORDINATOR_ATTENDANCE_KEY, JSON.stringify(records));
}

function createAttendanceId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const AttendanceService = {
  async loadEventParticipants(eventId: string): Promise<ParticipantAttendanceView[]> {
    const participants = await ParticipantService.getEventParticipants(eventId);

    let firestoreRecords: AttendanceRecordRow[] = [];
    try {
      firestoreRecords = await listAttendanceByEvent(eventId);
    } catch {
      firestoreRecords = [];
    }

    const stored = getStoredAttendance();

    // Merge firestore + local records for this event, keyed by participant.
    // Local (working) state takes precedence so a quick mark/clear is never
    // reverted by a stale firestore read, and one status exists per participant.
    const recordByParticipant = new Map<string, CoordinatorAttendanceRecord>();
    if (!isCleared(eventId)) {
      firestoreRecords.forEach((a) => {
        recordByParticipant.set(a.participant_id, {
          attendanceId: String(a.id || a.attendance_id),
          eventId: a.event_id,
          participantId: a.participant_id,
          coordinatorId: a.coordinator_id,
          status: a.status,
          checkInTime: a.check_in_time,
          remarks: a.remarks || '',
          updatedAt: a.updated_at,
        });
      });
    }
    stored
      .filter((a) => a.eventId === eventId)
      .forEach((a) => {
        recordByParticipant.set(a.participantId, a);
      });

    saveAttendance([
      ...stored.filter((a) => a.eventId !== eventId),
      ...Array.from(recordByParticipant.values()),
    ]);

    return participants.map((p) => {
      const record = recordByParticipant.get(p.participantId);
      return {
        ...p,
        attendanceStatus: record ? (record.status as 'Present' | 'Absent') : 'Not Marked',
      } as ParticipantAttendanceView;
    });
  },

  getEventAttendanceStats(
    eventId: string,
    participants?: EventParticipant[],
    capacity?: number
  ): EventAttendanceStats {
    const list = participants || [];
    const attendance = getStoredAttendance().filter(
      (a) => a.eventId === eventId
    );

    const totalRegistered = list.length;
    const verified = list.filter((p) => p.paymentStatus === 'Approved').length;
    const pendingVerification = Math.max(0, totalRegistered - verified);
    const present = attendance.filter((a) => a.status === 'Present').length;
    const absent = attendance.filter((a) => a.status === 'Absent').length;
    const percentage = verified > 0
      ? Math.round((present / verified) * 100)
      : 0;

    const stats: EventAttendanceStats = {
      totalRegistered,
      verified,
      pendingVerification,
      present,
      absent,
      percentage,
    };
    if (capacity && capacity > 0) {
      stats.capacity = capacity;
      stats.remainingSeats = Math.max(0, capacity - totalRegistered);
    }
    return stats;
  },

  getAttendanceRecords(eventId: string): CoordinatorAttendanceRecord[] {
    return getStoredAttendance().filter((a) => a.eventId === eventId);
  },

  // Replace any existing record for the same participant + event so that only
  // ONE attendance status can exist at a time (Present XOR Absent).
  upsertLocalRecord(record: CoordinatorAttendanceRecord): void {
    const records = getStoredAttendance();
    const filtered = records.filter(
      (r) => !(r.participantId === record.participantId && r.eventId === record.eventId)
    );
    saveAttendance([...filtered, record]);
  },

  // Persist a single record to Firestore. Failures are reported to the console
  // but never block the UI, which is driven by local state.
  async syncToFirestore(record: CoordinatorAttendanceRecord): Promise<void> {
    try {
      await upsertAttendance({
        event_id: record.eventId,
        participant_id: record.participantId,
        coordinator_id: record.coordinatorId,
        status: record.status,
        check_in_time: record.checkInTime,
        remarks: record.remarks,
      });
      clearClearedFlag(record.eventId);
    } catch (error) {
      console.error('Attendance sync failed', error);
    }
  },

  async markPresent(
    participantId: string,
    eventId: string,
    coordinatorId: string
  ): Promise<CoordinatorAttendanceRecord> {
    const nowIso = new Date().toISOString();
    const existing = getStoredAttendance().find(
      (r) => r.participantId === participantId && r.eventId === eventId
    );

    const result: CoordinatorAttendanceRecord = {
      attendanceId: existing?.attendanceId || createAttendanceId(),
      eventId,
      participantId,
      coordinatorId,
      status: 'Present',
      checkInTime: existing?.checkInTime || nowIso,
      remarks: existing?.remarks || '',
      updatedAt: nowIso,
    };
    this.upsertLocalRecord(result);
    await this.syncToFirestore(result);
    return result;
  },

  async markAbsent(
    participantId: string,
    eventId: string,
    coordinatorId: string
  ): Promise<CoordinatorAttendanceRecord> {
    const nowIso = new Date().toISOString();
    const existing = getStoredAttendance().find(
      (r) => r.participantId === participantId && r.eventId === eventId
    );

    const result: CoordinatorAttendanceRecord = {
      attendanceId: existing?.attendanceId || createAttendanceId(),
      eventId,
      participantId,
      coordinatorId,
      status: 'Absent',
      checkInTime: null,
      remarks: existing?.remarks || '',
      updatedAt: nowIso,
    };
    this.upsertLocalRecord(result);
    await this.syncToFirestore(result);
    return result;
  },

  async markAllPresent(eventId: string, coordinatorId: string, participants: ParticipantAttendanceView[]): Promise<void> {
    const nowIso = new Date().toISOString();
    const records = getStoredAttendance();
    const others = records.filter((r) => r.eventId !== eventId);
    const updated: CoordinatorAttendanceRecord[] = [...others];
    const batch: Array<{ participant_id: string; status: 'Present' | 'Absent' }> = [];

    participants.forEach((p) => {
      updated.push({
        attendanceId: createAttendanceId(),
        eventId,
        participantId: p.participantId,
        coordinatorId,
        status: 'Present',
        checkInTime: nowIso,
        remarks: '',
        updatedAt: nowIso,
      });
      batch.push({ participant_id: p.participantId, status: 'Present' });
    });

    saveAttendance(updated);
    clearClearedFlag(eventId);
    try {
      await saveFirestoreBatch(batch, eventId, coordinatorId);
    } catch (error) {
      console.error('Attendance sync failed', error);
    }
  },

  // Clears attendance for an event. Local state is always reset synchronously
  // and the cleared-flag hides any stale Firestore records until the DB delete
  // succeeds. Returns true only when the Firestore records were actually deleted.
  async clearAttendance(eventId: string): Promise<boolean> {
    const records = getStoredAttendance();
    saveAttendance(records.filter((r) => r.eventId !== eventId));
    markCleared(eventId);
    try {
      await clearAttendanceByEvent(eventId);
      clearClearedFlag(eventId);
      return true;
    } catch (error) {
      console.error('Attendance clear failed', error);
      return false;
    }
  },

  updateAttendance(
    attendanceId: string,
    status: 'Present' | 'Absent'
  ): void {
    const records = getStoredAttendance();
    const target = records.find((r) => r.attendanceId === attendanceId);
    if (!target) return;
    const updated: CoordinatorAttendanceRecord = {
      ...target,
      status,
      checkInTime: status === 'Present' ? (target.checkInTime || new Date().toISOString()) : null,
      updatedAt: new Date().toISOString(),
    };
    this.upsertLocalRecord(updated);
    void this.syncToFirestore(updated);
  },

  async saveAttendanceBatch(
    records: Array<{ participantId: string; status: 'Present' | 'Absent' }>,
    eventId: string,
    coordinatorId: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const existing = getStoredAttendance();
    const others = existing.filter((e) => e.eventId !== eventId);
    const newRecords: CoordinatorAttendanceRecord[] = records.map((r) => ({
      attendanceId: createAttendanceId(),
      eventId,
      participantId: r.participantId,
      coordinatorId,
      status: r.status,
      checkInTime: r.status === 'Present' ? nowIso : null,
      remarks: '',
      updatedAt: nowIso,
    }));

    saveAttendance([...others, ...newRecords]);
    clearClearedFlag(eventId);
    try {
      await saveFirestoreBatch(
        records.map((r) => ({ participant_id: r.participantId, status: r.status })),
        eventId,
        coordinatorId
      );
    } catch (error) {
      console.error('Attendance save failed', error);
    }
  },

  generateQRData(participantId: string, eventId: string): string {
    const payload = JSON.stringify({ participantId, eventId, ts: Date.now() });
    return btoa(payload);
  },

  decodeQRData(qrString: string): { participantId: string; eventId: string } | null {
    try {
      const decoded = atob(qrString);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  },

  isDuplicateCheckIn(participantId: string, eventId: string): boolean {
    const records = getStoredAttendance();
    return records.some(
      (r) => r.participantId === participantId && r.eventId === eventId && r.status === 'Present'
    );
  },
};
