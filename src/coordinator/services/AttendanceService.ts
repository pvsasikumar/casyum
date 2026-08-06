import type {
  CoordinatorAttendanceRecord,
  ParticipantAttendanceView,
  EventAttendanceStats,
  EventParticipant,
} from '../types';
import type { AttendanceRecordRow } from '../../services/attendanceService';
import { now } from '../../services/helpers';
import {
  upsertAttendance,
  clearAttendanceByEvent,
  saveAttendanceBatch as saveFirestoreBatch,
  listAttendanceByEvent,
  subscribeAttendanceByEvent,
  attendanceDocId,
  markAttendance as markAttendanceRecord,
} from '../../services/attendanceService';
import { ParticipantService, type ParticipantVerificationInfo } from './ParticipantService';

export type AttendanceStatusValue = 'Present' | 'Absent' | 'Not Marked';

function toRecord(row: AttendanceRecordRow): CoordinatorAttendanceRecord {
  return {
    attendanceId: String(row.id || row.attendance_id),
    eventId: row.event_id,
    participantId: row.participant_id,
    casyumId: row.casyum_id || '',
    coordinatorId: row.coordinator_id,
    status: row.status === 'Absent' ? 'Absent' : 'Present',
    checkInTime: row.check_in_time,
    remarks: row.remarks || '',
    updatedAt: row.updated_at,
  };
}

export const AttendanceService = {
  // Normalize inconsistent status values (Present/present/PRESENT, etc.).
  normalizeAttendanceStatus(raw: unknown): AttendanceStatusValue {
    const value = String(raw ?? '').trim().toLowerCase();
    if (value === 'present') return 'Present';
    if (value === 'absent') return 'Absent';
    return 'Not Marked';
  },

  // One status per participant: keep the most recently updated record.
  latestPerParticipant(records: CoordinatorAttendanceRecord[]): Record<string, CoordinatorAttendanceRecord> {
    const map: Record<string, CoordinatorAttendanceRecord> = {};
    records.forEach((record) => {
      const existing = map[record.participantId];
      if (!existing || String(record.updatedAt || '') >= String(existing.updatedAt || '')) {
        map[record.participantId] = record;
      }
    });
    return map;
  },

  createRecord(
    eventId: string,
    participantId: string,
    coordinatorId: string,
    status: 'Present' | 'Absent',
    existing?: CoordinatorAttendanceRecord,
    casyumId?: string
  ): CoordinatorAttendanceRecord {
    const nowIso = now();
    return {
      attendanceId: existing?.attendanceId || attendanceDocId(eventId, participantId),
      eventId,
      participantId,
      casyumId: casyumId || existing?.casyumId || '',
      coordinatorId,
      status,
      checkInTime: status === 'Present' ? (existing?.checkInTime || nowIso) : null,
      remarks: existing?.remarks || '',
      updatedAt: nowIso,
    };
  },

  // One-time load used by the dashboard. The attendance page uses the real-time
  // subscriptions below instead.
  async loadEventParticipants(eventId: string): Promise<ParticipantAttendanceView[]> {
    const [participants, rows, verificationMap] = await Promise.all([
      ParticipantService.getEventParticipants(eventId),
      listAttendanceByEvent(eventId).catch(() => [] as AttendanceRecordRow[]),
      ParticipantService.getParticipantVerifications().catch(
        () => ({} as Record<string, ParticipantVerificationInfo>)
      ),
    ]);
    const byParticipant = this.latestPerParticipant(rows.map(toRecord));
    return participants.map((p) => {
      const verification = verificationMap[p.participantId];
      return {
        ...p,
        ...(verification
          ? { verificationStatus: verification.verificationStatus, verifiedBy: verification.verifiedBy }
          : {}),
        attendanceStatus: byParticipant[p.participantId]
          ? this.normalizeAttendanceStatus(byParticipant[p.participantId].status)
          : 'Not Marked',
      } as ParticipantAttendanceView;
    });
  },

  subscribeRegistrations(
    eventId: string,
    onNext: (participants: EventParticipant[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    return ParticipantService.subscribeEventParticipants(eventId, onNext, onError);
  },

  subscribeAttendance(
    eventId: string,
    onNext: (records: CoordinatorAttendanceRecord[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    return subscribeAttendanceByEvent(eventId, (rows) => onNext(rows.map(toRecord)), onError);
  },

  // Realtime map of participant verification status used to lock attendance
  // until the participant is verified at the Registration Desk.
  subscribeVerifications(
    onNext: (byId: Record<string, ParticipantVerificationInfo>) => void,
    onError?: (error: Error) => void
  ): () => void {
    return ParticipantService.subscribeParticipantVerifications(onNext, onError);
  },

  // Single-record write. The UI drives optimistic state and calls this in the
  // background; a failure is reported to the caller so it can revert.
  async writeAttendance(record: CoordinatorAttendanceRecord): Promise<void> {
    await upsertAttendance({
      event_id: record.eventId,
      participant_id: record.participantId,
      casyum_id: record.casyumId,
      coordinator_id: record.coordinatorId,
      status: record.status,
      check_in_time: record.checkInTime,
      remarks: record.remarks,
    });
  },

  /**
   * Duplicate-safe attendance write for the Event Coordinator QR flow. Awaits
   * the Firestore write before resolving, so the caller can show success only
   * after the record is actually saved. If the participant already has
   * attendance for this event the existing record is returned (`created: false`)
   * instead of creating a duplicate.
   */
  async markAttendance(args: {
    eventId: string;
    participantId: string;
    casyumId?: string;
    coordinatorId: string;
  }): Promise<{ created: boolean; existing: CoordinatorAttendanceRecord | null; record: CoordinatorAttendanceRecord | null }> {
    const result = await markAttendanceRecord({
      event_id: args.eventId,
      participant_id: args.participantId,
      casyum_id: args.casyumId,
      coordinator_id: args.coordinatorId,
    });
    if (result.created) {
      const record = this.createRecord(
        args.eventId,
        args.participantId,
        args.coordinatorId,
        'Present',
        undefined,
        args.casyumId
      );
      return { created: true, existing: null, record };
    }
    const existing = toRecord(result.existing!);
    return { created: false, existing, record: existing };
  },

  async markAllPresent(eventId: string, coordinatorId: string, participantIds: string[]): Promise<void> {
    await saveFirestoreBatch(
      participantIds.map((participant_id) => ({ participant_id, status: 'Present' as const })),
      eventId,
      coordinatorId
    );
  },

  async clearAttendance(eventId: string): Promise<void> {
    await clearAttendanceByEvent(eventId);
  },

  async saveAttendanceBatch(
    records: Array<{ participantId: string; status: 'Present' | 'Absent' }>,
    eventId: string,
    coordinatorId: string
  ): Promise<void> {
    await saveFirestoreBatch(
      records.map((r) => ({ participant_id: r.participantId, status: r.status })),
      eventId,
      coordinatorId
    );
  },

  getEventAttendanceStats(
    _eventId: string,
    participants?: EventParticipant[],
    capacity?: number
  ): EventAttendanceStats {
    const list = participants || [];
    const totalRegistered = list.length;
    const verified = list.filter((p) => p.paymentStatus === 'Approved').length;
    const pendingVerification = Math.max(0, totalRegistered - verified);
    const present = list.filter(
      (p) => this.normalizeAttendanceStatus((p as ParticipantAttendanceView).attendanceStatus) === 'Present'
    ).length;
    const absent = list.filter(
      (p) => this.normalizeAttendanceStatus((p as ParticipantAttendanceView).attendanceStatus) === 'Absent'
    ).length;
    const percentage = totalRegistered > 0
      ? Math.round((present / totalRegistered) * 100)
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
};
