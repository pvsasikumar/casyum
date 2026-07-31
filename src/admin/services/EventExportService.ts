import { sanitizeFilename, downloadCSV, downloadExcel, downloadPDF } from '../components/export/ExportService';
import type { Participant, EventItem } from '../types';
import { api } from '../../services/api';
import { listAttendanceByEvent } from '../../services/attendanceService';

export interface RegisteredParticipant extends Participant {
  registrationId: string;
  eventName: string;
  attendanceStatus: string;
  coordinators: string;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function mapParticipantRow(row: any): Participant {
  return {
    id: String(row.participant_id),
    name: row.full_name || '',
    photo: row.photo || '',
    college: row.college || '',
    department: row.department || '',
    year: row.year_of_study || '',
    registerNumber: row.register_number || '',
    mobile: row.phone || '',
    email: row.email || '',
    gender: (row.gender === 'Male' || row.gender === 'Female' ? row.gender : 'Other') as Participant['gender'],
    studentId: row.student_id || '',
    registeredEvents: (row.registered_events || []).map((r: any) => String(r.event_id)),
    paymentStatus: (row.payment_status || 'Pending') as Participant['paymentStatus'],
    paymentScreenshotUrl: row.payment_screenshot_url || '',
    transactionId: row.transaction_id || '',
    paymentAmount: Number(row.payment_amount) || 0,
    paymentUploadedTime: row.payment_uploaded_time || '',
    paymentRemarks: row.payment_remarks || '',
    registrationDate: row.created_at || '',
    isDuplicateTransaction: false,
  };
}

function mapEventRow(row: any): EventItem {
  const name = row?.name || '';
  return {
    id: String(row?.id),
    name,
    category: row?.category || 'Technical',
    tagline: row?.tagline || '',
    description: row?.description || '',
    iconName: row?.iconName || 'Calendar',
    bannerImage: row?.banner_image || '/images/final.jpeg',
    venue: row?.venue || '',
    time: row?.time || '',
    date: row?.event_date || '',
    fee: Number(row?.fee) || 0,
    maxParticipants: Number(row?.max_participants) || 0,
    registeredCount: Number(row?.registered_count) || 0,
    facultyCoordinator: row?.faculty_coordinator || '',
    studentCoordinator: row?.student_coordinator || '',
    status: row?.status || 'Open',
    revenue: 0,
    rules: [],
  };
}

export class EventExportService {
  static async getEvents(): Promise<EventItem[]> {
    await delay(300);
    try {
      const res = await api.event.list();
      return (res.events || []).map(mapEventRow);
    } catch {
      return [];
    }
  }

  static async getEventParticipants(eventId: string): Promise<RegisteredParticipant[]> {
    await delay(300);
    const [participantsRes, eventsRes, attendance, coordinatorsRes] = await Promise.all([
      api.participant.list(),
      api.event.list(),
      listAttendanceByEvent(eventId),
      api.coordinator.list(),
    ]);

    const participants = (participantsRes.participants || []).map(mapParticipantRow);
    const events = (eventsRes.events || []).map(mapEventRow);
    const coordinators: any[] = coordinatorsRes.coordinators || [];

    const event = events.find((e) => e.id === eventId);
    if (!event) return [];

    const coordNames = coordinators.filter((c) => c.full_name).map((c) => c.full_name).join(', ') || 'N/A';

    return participants
      .filter((p) => p.registeredEvents?.includes(eventId))
      .map((p, idx) => {
        const att = attendance.find((a) => a.participant_id === p.id);
        return {
          ...p,
          registrationId: `REG-${String(idx + 1).padStart(4, '0')}`,
          eventName: event.name,
          attendanceStatus: att?.status || 'Not Marked',
          coordinators: coordNames,
        };
      });
  }

  static getExportFilename(eventName: string, format: string): string {
    return `${sanitizeFilename(eventName)}_participants.${format}`;
  }

  static async exportCSV(participants: RegisteredParticipant[]): Promise<void> {
    await delay(200);
    if (!participants.length) throw new Error('No data available to export.');
    const eventName = participants[0].eventName;
    const rows = participants.map((p) => ({
      'Registration ID': p.registrationId,
      'Participant Name': p.name,
      'Email': p.email,
      'Phone': p.mobile,
      'College': p.college,
      'Department': p.department,
      'Year': p.year,
      'Gender': p.gender,
      'Event Name': p.eventName,
      'Registration Date': p.registrationDate,
      'Payment Status': p.paymentStatus,
      'Attendance Status': p.attendanceStatus,
      'Coordinator(s)': p.coordinators,
    }));
    downloadCSV(rows, this.getExportFilename(eventName, 'csv'));
  }

  static async exportExcel(participants: RegisteredParticipant[]): Promise<void> {
    await delay(200);
    if (!participants.length) throw new Error('No data available to export.');
    const eventName = participants[0].eventName;
    const headers = [
      'Registration ID', 'Participant Name', 'Email', 'Phone',
      'College', 'Department', 'Year', 'Gender', 'Event Name',
      'Registration Date', 'Payment Status', 'Attendance Status', 'Coordinator(s)',
    ];
    const rows = participants.map((p) => [
      p.registrationId, p.name, p.email, p.mobile,
      p.college, p.department, p.year, p.gender, p.eventName,
      p.registrationDate, p.paymentStatus, p.attendanceStatus, p.coordinators,
    ]);
    downloadExcel(headers, rows, this.getExportFilename(eventName, 'xlsx'));
  }

  static async exportPDF(participants: RegisteredParticipant[]): Promise<void> {
    await delay(200);
    if (!participants.length) throw new Error('No data available to export.');
    const eventName = participants[0].eventName;
    const headers = [
      'Reg ID', 'Name', 'Email', 'Phone', 'College', 'Department',
      'Year', 'Gender', 'Event', 'Reg Date', 'Payment', 'Attendance', 'Coordinator(s)',
    ];
    const rows = participants.map((p) => [
      p.registrationId, p.name, p.email, p.mobile,
      p.college, p.department, p.year, p.gender, p.eventName,
      p.registrationDate, p.paymentStatus, p.attendanceStatus, p.coordinators,
    ]);
    downloadPDF(`${eventName} - Participants`, headers, rows);
  }
}
