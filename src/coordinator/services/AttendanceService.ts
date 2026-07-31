import type {
  CoordinatorAttendanceRecord,
  ParticipantAttendanceView,
  EventAttendanceStats,
} from '../types';
import { getEvent } from '../../services/eventService';
import {
  upsertAttendance,
  clearAttendanceByEvent,
  saveAttendanceBatch as saveFirestoreBatch,
  listAttendanceByEvent,
} from '../../services/attendanceService';

const COORDINATOR_ATTENDANCE_KEY = 'casyum_coordinator_attendance';

function getStoredAttendance(): CoordinatorAttendanceRecord[] {
  const saved = localStorage.getItem(COORDINATOR_ATTENDANCE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function saveAttendance(records: CoordinatorAttendanceRecord[]): void {
  localStorage.setItem(COORDINATOR_ATTENDANCE_KEY, JSON.stringify(records));
}

export const AttendanceService = {
  async loadEventParticipants(eventId: string): Promise<ParticipantAttendanceView[]> {
    try {
      const { event } = await getEvent(eventId);
      const registrations = event?.registrations || [];
      const stored = getStoredAttendance();
      const firestoreRecords = await listAttendanceByEvent(eventId);

      if (firestoreRecords.length) {
        const synced: CoordinatorAttendanceRecord[] = firestoreRecords.map((a) => ({
          attendanceId: String(a.id || a.attendance_id),
          eventId: a.event_id,
          participantId: a.participant_id,
          coordinatorId: a.coordinator_id,
          status: a.status,
          checkInTime: a.check_in_time,
          remarks: a.remarks || '',
          updatedAt: a.updated_at,
        }));
        const merged = [...synced, ...stored.filter((s) => s.eventId !== eventId)];
        saveAttendance(merged);
      }

      return registrations
        .filter((r: any) => r.status !== 'Cancelled')
        .map((r: any) => {
          const participantId = String(r.participant_user_id || r.participant_email || r.registration_id);
          const localRecord = stored.find(
            (a) => a.participantId === participantId && a.eventId === eventId
          );
          const fbRecord = firestoreRecords.find((a) => a.participant_id === participantId);
          const record = fbRecord || localRecord;
          return {
            registrationId: r.registration_id || `REG-${participantId}`,
            participantId,
            participantName: r.user_full_name || r.participant_name || 'Participant',
            college: r.college || '',
            department: r.user_department || '',
            phoneNumber: r.user_phone || '',
            registrationStatus: r.status === 'Confirmed' ? 'Confirmed' : (r.status || 'Pending'),
            attendanceStatus: record ? (record.status as 'Present' | 'Absent') : 'Not Marked',
          } as ParticipantAttendanceView;
        });
    } catch {
      return [];
    }
  },

  getEventAttendanceStats(eventId: string, participants?: ParticipantAttendanceView[]): EventAttendanceStats {
    const list = participants || [];
    const attendance = getStoredAttendance().filter(
      (a) => a.eventId === eventId
    );

    const totalRegistered = list.length;
    const present = attendance.filter((a) => a.status === 'Present').length;
    const absent = attendance.filter((a) => a.status === 'Absent').length;
    const percentage = totalRegistered > 0
      ? Math.round(((present + absent) / totalRegistered) * 100)
      : 0;

    return { totalRegistered, present, absent, percentage };
  },

  getAttendanceRecords(eventId: string): CoordinatorAttendanceRecord[] {
    return getStoredAttendance().filter((a) => a.eventId === eventId);
  },

  markPresent(
    participantId: string,
    eventId: string,
    coordinatorId: string
  ): CoordinatorAttendanceRecord {
    const records = getStoredAttendance();
    const existing = records.find(
      (r) => r.participantId === participantId && r.eventId === eventId
    );

    let result: CoordinatorAttendanceRecord;
    if (existing) {
      result = {
        ...existing,
        status: 'Present' as const,
        checkInTime: existing.checkInTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newRecords = records.map((r) =>
        r.attendanceId === existing.attendanceId ? result : r
      );
      saveAttendance(newRecords);
    } else {
      result = {
        attendanceId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventId,
        participantId,
        coordinatorId,
        status: 'Present',
        checkInTime: new Date().toISOString(),
        remarks: '',
        updatedAt: new Date().toISOString(),
      };
      saveAttendance([...records, result]);
    }
    void upsertAttendance({
      event_id: eventId,
      participant_id: participantId,
      coordinator_id: coordinatorId,
      status: 'Present',
      check_in_time: result.checkInTime,
      remarks: result.remarks,
    });
    return result;
  },

  markAbsent(
    participantId: string,
    eventId: string,
    coordinatorId: string
  ): CoordinatorAttendanceRecord {
    const records = getStoredAttendance();
    const existing = records.find(
      (r) => r.participantId === participantId && r.eventId === eventId
    );

    let result: CoordinatorAttendanceRecord;
    if (existing) {
      result = {
        ...existing,
        status: 'Absent' as const,
        checkInTime: null,
        updatedAt: new Date().toISOString(),
      };
      const newRecords = records.map((r) =>
        r.attendanceId === existing.attendanceId ? result : r
      );
      saveAttendance(newRecords);
    } else {
      result = {
        attendanceId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventId,
        participantId,
        coordinatorId,
        status: 'Absent',
        checkInTime: null,
        remarks: '',
        updatedAt: new Date().toISOString(),
      };
      saveAttendance([...records, result]);
    }
    void upsertAttendance({
      event_id: eventId,
      participant_id: participantId,
      coordinator_id: coordinatorId,
      status: 'Absent',
      check_in_time: null,
      remarks: result.remarks,
    });
    return result;
  },

  markAllPresent(eventId: string, coordinatorId: string, participants: ParticipantAttendanceView[]): void {
    participants.forEach((p) => {
      this.markPresent(p.participantId, eventId, coordinatorId);
    });
  },

  clearAttendance(eventId: string): void {
    const records = getStoredAttendance();
    const filtered = records.filter((r) => r.eventId !== eventId);
    saveAttendance(filtered);
    void clearAttendanceByEvent(eventId);
  },

  updateAttendance(
    attendanceId: string,
    status: 'Present' | 'Absent'
  ): void {
    const records = getStoredAttendance();
    const updated = records.map((r) =>
      r.attendanceId === attendanceId
        ? {
            ...r,
            status,
            checkInTime: status === 'Present' ? (r.checkInTime || new Date().toISOString()) : null,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    saveAttendance(updated);
    const target = updated.find((r) => r.attendanceId === attendanceId);
    if (target) {
      void upsertAttendance({
        event_id: target.eventId,
        participant_id: target.participantId,
        coordinator_id: target.coordinatorId,
        status,
        check_in_time: target.checkInTime,
        remarks: target.remarks,
      });
    }
  },

  saveAttendanceBatch(
    records: Array<{ participantId: string; status: 'Present' | 'Absent' }>,
    eventId: string,
    coordinatorId: string
  ): void {
    const existing = getStoredAttendance();
    const newRecords = records.map((r) => {
      const found = existing.find(
        (e) => e.participantId === r.participantId && e.eventId === eventId
      );
      if (found) {
        return {
          ...found,
          status: r.status,
          checkInTime: r.status === 'Present' ? (found.checkInTime || new Date().toISOString()) : null,
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        attendanceId: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        eventId,
        participantId: r.participantId,
        coordinatorId,
        status: r.status,
        checkInTime: r.status === 'Present' ? new Date().toISOString() : null,
        remarks: '',
        updatedAt: new Date().toISOString(),
      } as CoordinatorAttendanceRecord;
    });

    const filtered = existing.filter((e) => e.eventId !== eventId);
    saveAttendance([...filtered, ...newRecords]);
    void saveFirestoreBatch(
      records.map((r) => ({ participant_id: r.participantId, status: r.status })),
      eventId,
      coordinatorId
    );
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
