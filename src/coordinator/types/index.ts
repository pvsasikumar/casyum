export interface CoordinatorAttendanceRecord {
  attendanceId: string;
  eventId: string;
  participantId: string;
  coordinatorId: string;
  status: 'Present' | 'Absent';
  checkInTime: string | null;
  remarks: string;
  updatedAt: string;
}

export interface EventAttendanceStats {
  totalRegistered: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface ParticipantAttendanceView {
  registrationId: string;
  participantId: string;
  participantName: string;
  college: string;
  department: string;
  phoneNumber: string;
  registrationStatus: string;
  attendanceStatus: 'Present' | 'Absent' | 'Not Marked';
}

export interface QRCheckInData {
  participantId: string;
  eventId: string;
  timestamp: string;
}

export type CoordinatorTab = 'dashboard' | 'attendance';
