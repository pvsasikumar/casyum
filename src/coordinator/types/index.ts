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
  verified: number;
  pendingVerification: number;
  present: number;
  absent: number;
  percentage: number;
  capacity?: number;
  remainingSeats?: number;
}

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface EventParticipant {
  registrationId: string;
  participantId: string;
  participantName: string;
  college: string;
  department: string;
  phoneNumber: string;
  email: string;
  registrationStatus: string;
  paymentStatus: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
}

export interface ParticipantAttendanceView extends EventParticipant {
  attendanceStatus: 'Present' | 'Absent' | 'Not Marked';
}

export interface QRCheckInData {
  participantId: string;
  eventId: string;
  timestamp: string;
}

export type CoordinatorTab = 'dashboard' | 'attendance';
