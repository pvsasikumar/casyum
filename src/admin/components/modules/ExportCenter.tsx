import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  UserCheck,
  ClipboardList,
  CheckSquare,
  DollarSign,
  Building,
  GraduationCap,
  Trophy,
  Award,
  Search,
  ShieldAlert,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ExportCard } from '../export/ExportCard';
import { ExportFilters, type FilterValues } from '../export/ExportFilters';
import {
  downloadCSV,
  downloadExcel,
  downloadPDF,
  sanitizeFilename,
  todayStr,
  yearStr,
} from '../export/ExportService';
import type { Participant } from '../../types';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

export const ExportCenter: React.FC = () => {
  const {
    role,
    participants,
    events,
    attendance,
    coordinators,
    certificates,
  } = useAdmin();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterValues>({
    eventId: '',
    college: '',
    department: '',
    registrationStatus: '',
    paymentStatus: '',
    attendanceStatus: '',
    dateFrom: '',
    dateTo: '',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (title: string, message: string, type: 'success' | 'error') => {
    const id = String(++toastId);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const collegeList = useMemo(
    () => Array.from(new Set(participants.map((p) => p.college))).sort(),
    [participants]
  );

  const deptList = useMemo(
    () => Array.from(new Set(participants.map((p) => p.department))).sort(),
    [participants]
  );

  const applyFilters = (data: Participant[]): Participant[] => {
    return data.filter((p) => {
      if (filters.college && p.college !== filters.college) return false;
      if (filters.department && p.department !== filters.department) return false;
      if (filters.registrationStatus && p.paymentStatus !== filters.registrationStatus) return false;
      if (filters.paymentStatus && p.paymentStatus !== filters.paymentStatus) return false;
      if (filters.eventId && !p.registeredEvents?.includes(filters.eventId)) return false;
      if (filters.dateFrom && p.registrationDate < filters.dateFrom) return false;
      if (filters.dateTo && p.registrationDate > filters.dateTo) return false;
      return true;
    });
  };

  const wrapExport = (
    fn: () => void,
    label: string
  ): Promise<void> => {
    return new Promise((resolve) => {
      try {
        fn();
        showToast('Export Successful', `${label} downloaded successfully.`, 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred.';
        showToast('Export Failed', msg, 'error');
      }
      resolve();
    });
  };

  if (role !== 'Super Admin') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 select-none">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20">
          <ShieldAlert className="w-10 h-10 text-rose-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white font-display">Access Denied</h2>
        <p className="text-sm text-white/50 max-w-md text-center">
          Only Super Admins can access the Export Center. Contact your administrator if you need export permissions.
        </p>
      </div>
    );
  }

  const ts = todayStr();
  const ys = yearStr();

  const modules = [
    {
      id: 'all-participants',
      icon: Users,
      iconBg: 'bg-violet-500/10 text-violet-400',
      title: 'All Participants',
      description: 'Complete participant database with contact info, payment status, and event registrations.',
      keyword: 'participants',
      onCSV: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const rows = filtered.map((p) => ({
            'Participant ID': p.id,
            'Full Name': p.name,
            'Email': p.email,
            'Phone Number': p.mobile,
            'Gender': p.gender,
            'College': p.college,
            'City': p.city,
            'Department': p.department,
            'Year': p.year,
            'Registration Date': p.registrationDate,
            'Payment Status': p.paymentStatus,
            'Total Registered Events': p.registeredEvents?.length || 0,
          }));
          downloadCSV(rows, `participants_${ts}.csv`);
        }, 'All Participants CSV'),
      onExcel: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Participant ID', 'Full Name', 'Email', 'Phone Number', 'Gender', 'College', 'City', 'Department', 'Year', 'Registration Date', 'Payment Status', 'Total Registered Events'];
          const rows = filtered.map((p) => [p.id, p.name, p.email, p.mobile, p.gender, p.college, p.city, p.department, p.year, p.registrationDate, p.paymentStatus, p.registeredEvents?.length || 0]);
          downloadExcel(headers, rows, `participants_${ts}.xlsx`);
        }, 'All Participants Excel'),
      onPDF: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Participant ID', 'Full Name', 'Email', 'Phone', 'College', 'City', 'Department', 'Year', 'Reg Date', 'Payment', 'Events'];
          const rows = filtered.map((p) => [p.id, p.name, p.email, p.mobile, p.college, p.city, p.department, p.year, p.registrationDate, p.paymentStatus, p.registeredEvents?.length || 0]);
          downloadPDF('All Participants Report', headers, rows, `participants_${ts}`);
        }, 'All Participants PDF'),
    },
    {
      id: 'event-wise',
      icon: Calendar,
      iconBg: 'bg-cyan-500/10 text-cyan-400',
      title: 'Event-wise Participants',
      description: 'Export participants registered for a selected event with attendance and payment info.',
      keyword: 'event participants',
      onCSV: () => {
        const evt = events.find((e) => e.id === filters.eventId);
        if (!evt) {
          showToast('Select Event', 'Please select an event from filters before exporting Event-wise data.', 'error');
          return Promise.resolve();
        }
        return wrapExport(() => {
          const filtered = applyFilters(participants).filter((p) => p.registeredEvents?.includes(evt.id));
          const rows = filtered.map((p) => {
            const att = attendance.find((a) => a.participantId === p.id && a.eventId === evt.id);
            return {
              'Event Name': evt.name,
              'Participant Name': p.name,
              'College': p.college,
              'City': p.city,
              'Department': p.department,
              'Phone': p.mobile,
              'Email': p.email,
              'Registration Date': p.registrationDate,
              'Attendance Status': att?.status || 'Not Marked',
              'Payment Status': p.paymentStatus,
            };
          });
          downloadCSV(rows, `event_${sanitizeFilename(evt.name)}_${ts}.csv`);
        }, 'Event-wise Participants CSV');
      },
      onExcel: () => {
        const evt = events.find((e) => e.id === filters.eventId);
        if (!evt) {
          showToast('Select Event', 'Please select an event from filters before exporting Event-wise data.', 'error');
          return Promise.resolve();
        }
        return wrapExport(() => {
          const filtered = applyFilters(participants).filter((p) => p.registeredEvents?.includes(evt.id));
          const headers = ['Event Name', 'Participant Name', 'College', 'City', 'Department', 'Phone', 'Email', 'Registration Date', 'Attendance Status', 'Payment Status'];
          const rows = filtered.map((p) => {
            const att = attendance.find((a) => a.participantId === p.id && a.eventId === evt.id);
            return [evt.name, p.name, p.college, p.city, p.department, p.mobile, p.email, p.registrationDate, att?.status || 'Not Marked', p.paymentStatus];
          });
          downloadExcel(headers, rows, `event_${sanitizeFilename(evt.name)}_${ys}.xlsx`);
        }, 'Event-wise Participants Excel');
      },
      onPDF: () => {
        const evt = events.find((e) => e.id === filters.eventId);
        if (!evt) {
          showToast('Select Event', 'Please select an event from filters before exporting Event-wise data.', 'error');
          return Promise.resolve();
        }
        return wrapExport(() => {
          const filtered = applyFilters(participants).filter((p) => p.registeredEvents?.includes(evt.id));
          const headers = ['Participant', 'College', 'City', 'Department', 'Phone', 'Email', 'Reg Date', 'Attendance', 'Payment'];
          const rows = filtered.map((p) => {
            const att = attendance.find((a) => a.participantId === p.id && a.eventId === evt.id);
            return [p.name, p.college, p.city, p.department, p.mobile, p.email, p.registrationDate, att?.status || 'Not Marked', p.paymentStatus];
          });
          downloadPDF(`${evt.name} - Participants`, headers, rows, `event_${sanitizeFilename(evt.name)}_${ys}`);
        }, 'Event-wise Participants PDF');
      },
    },
    {
      id: 'coordinators',
      icon: UserCheck,
      iconBg: 'bg-amber-500/10 text-amber-400',
      title: 'Coordinator Report',
      description: 'All coordinators with assigned events, contact info, and account status.',
      keyword: 'coordinators',
      onCSV: () =>
        wrapExport(() => {
          const rows = coordinators.map((c) => ({
            'Coordinator Name': c.full_name,
            'Email': c.email,
            'Phone': c.phone,
            'Department': c.department,
            'Designation': c.designation,
            'Username': c.username,
            'Role': c.role,
            'Status': c.status,
          }));
          downloadCSV(rows, `coordinators_${ts}.csv`);
        }, 'Coordinator Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const headers = ['Coordinator Name', 'Email', 'Phone', 'Department', 'Designation', 'Username', 'Role', 'Status'];
          const rows = coordinators.map((c) => [c.full_name, c.email, c.phone, c.department, c.designation, c.username, c.role, c.status]);
          downloadExcel(headers, rows, `coordinators_${ts}.xlsx`);
        }, 'Coordinator Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const headers = ['Name', 'Email', 'Phone', 'Department', 'Designation', 'Role', 'Status'];
          const rows = coordinators.map((c) => [c.full_name, c.email, c.phone, c.department, c.designation, c.role, c.status]);
          downloadPDF('Coordinator Report', headers, rows, `coordinators_${ts}`);
        }, 'Coordinator Report PDF'),
    },
    {
      id: 'registrations',
      icon: ClipboardList,
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      title: 'Registration Report',
      description: 'All registrations with participant, event, status, and payment details.',
      keyword: 'registrations',
      onCSV: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const rows: Record<string, unknown>[] = [];
          filtered.forEach((p) => {
            const regEvents = p.registeredEvents?.length ? p.registeredEvents : ['N/A'];
            regEvents.forEach((evtId) => {
              const evt = events.find((e) => e.id === evtId);
              rows.push({
                'Registration ID': `${p.id}-${evtId}`,
                'Participant': p.name,
                'Event': evt?.name || 'Unknown Event',
                'Registration Date': p.registrationDate,
                'Status': 'Registered',
                'Payment Status': p.paymentStatus,
              });
            });
          });
          downloadCSV(rows, `registrations_${ts}.csv`);
        }, 'Registration Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Registration ID', 'Participant', 'Event', 'Registration Date', 'Status', 'Payment Status'];
          const rows: unknown[][] = [];
          filtered.forEach((p) => {
            const regEvents = p.registeredEvents?.length ? p.registeredEvents : ['N/A'];
            regEvents.forEach((evtId) => {
              const evt = events.find((e) => e.id === evtId);
              rows.push([`${p.id}-${evtId}`, p.name, evt?.name || 'Unknown Event', p.registrationDate, 'Registered', p.paymentStatus]);
            });
          });
          downloadExcel(headers, rows, `registrations_${ts}.xlsx`);
        }, 'Registration Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Registration ID', 'Participant', 'Event', 'Reg Date', 'Status', 'Payment'];
          const rows: unknown[][] = [];
          filtered.forEach((p) => {
            const regEvents = p.registeredEvents?.length ? p.registeredEvents : ['N/A'];
            regEvents.forEach((evtId) => {
              const evt = events.find((e) => e.id === evtId);
              rows.push([`${p.id}-${evtId}`, p.name, evt?.name || 'Unknown', p.registrationDate, 'Registered', p.paymentStatus]);
            });
          });
          downloadPDF('Registration Report', headers, rows, `registrations_${ts}`);
        }, 'Registration Report PDF'),
    },
    {
      id: 'attendance',
      icon: CheckSquare,
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      title: 'Attendance Report',
      description: 'Attendance records with check-in times and status for all events.',
      keyword: 'attendance',
      onCSV: () =>
        wrapExport(() => {
          let data = [...attendance];
          if (filters.eventId) data = data.filter((a) => a.eventId === filters.eventId);
          if (filters.attendanceStatus) data = data.filter((a) => a.status === filters.attendanceStatus);
          if (filters.dateFrom) data = data.filter((a) => a.timestamp >= filters.dateFrom);
          if (filters.dateTo) data = data.filter((a) => a.timestamp <= filters.dateTo);
          const rows = data.map((a) => ({
            'Participant Name': a.participantName,
            'Event': a.eventName,
            'Check-in Time': a.timestamp,
            'Attendance Status': a.status,
          }));
          downloadCSV(rows, `attendance_${ts}.csv`);
        }, 'Attendance Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          let data = [...attendance];
          if (filters.eventId) data = data.filter((a) => a.eventId === filters.eventId);
          if (filters.attendanceStatus) data = data.filter((a) => a.status === filters.attendanceStatus);
          if (filters.dateFrom) data = data.filter((a) => a.timestamp >= filters.dateFrom);
          if (filters.dateTo) data = data.filter((a) => a.timestamp <= filters.dateTo);
          const headers = ['Participant Name', 'Event', 'Check-in Time', 'Attendance Status'];
          const rows = data.map((a) => [a.participantName, a.eventName, a.timestamp, a.status]);
          downloadExcel(headers, rows, `attendance_${ts}.xlsx`);
        }, 'Attendance Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          let data = [...attendance];
          if (filters.eventId) data = data.filter((a) => a.eventId === filters.eventId);
          if (filters.attendanceStatus) data = data.filter((a) => a.status === filters.attendanceStatus);
          if (filters.dateFrom) data = data.filter((a) => a.timestamp >= filters.dateFrom);
          if (filters.dateTo) data = data.filter((a) => a.timestamp <= filters.dateTo);
          const headers = ['Participant', 'Event', 'Check-in Time', 'Status'];
          const rows = data.map((a) => [a.participantName, a.eventName, a.timestamp, a.status]);
          downloadPDF('Attendance Report', headers, rows, `attendance_${ts}`);
        }, 'Attendance Report PDF'),
    },
    {
      id: 'payments',
      icon: DollarSign,
      iconBg: 'bg-green-500/10 text-green-400',
      title: 'Payment Report',
      description: 'Payment details with transaction IDs, methods, amounts, and verification status.',
      keyword: 'payment',
      onCSV: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const rows = filtered.map((p) => ({
            'Participant': p.name,
            'Event': p.registeredEvents?.map((eid) => events.find((e) => e.id === eid)?.name).filter(Boolean).join('; ') || 'N/A',
            'Amount': p.paymentAmount,
            'Transaction ID': p.transactionId,
            'Payment Method': 'UPI',
            'Payment Status': p.paymentStatus,
            'Payment Date': p.paymentUploadedTime,
          }));
          downloadCSV(rows, `payments_${ts}.csv`);
        }, 'Payment Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Participant', 'Event', 'Amount', 'Transaction ID', 'Payment Method', 'Payment Status', 'Payment Date'];
          const rows = filtered.map((p) => [
            p.name,
            p.registeredEvents?.map((eid) => events.find((e) => e.id === eid)?.name).filter(Boolean).join('; ') || 'N/A',
            p.paymentAmount,
            p.transactionId,
            'UPI',
            p.paymentStatus,
            p.paymentUploadedTime,
          ]);
          downloadExcel(headers, rows, `payments_${ts}.xlsx`);
        }, 'Payment Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const headers = ['Participant', 'Event', 'Amount', 'Transaction ID', 'Method', 'Status', 'Date'];
          const rows = filtered.map((p) => [
            p.name,
            p.registeredEvents?.map((eid) => events.find((e) => e.id === eid)?.name).filter(Boolean).join('; ') || 'N/A',
            `\u20B9${p.paymentAmount}`,
            p.transactionId,
            'UPI',
            p.paymentStatus,
            p.paymentUploadedTime,
          ]);
          downloadPDF('Payment Report', headers, rows, `payments_${ts}`);
        }, 'Payment Report PDF'),
    },
    {
      id: 'college-wise',
      icon: Building,
      iconBg: 'bg-purple-500/10 text-purple-400',
      title: 'College-wise Report',
      description: 'Institution-wise participant counts and event participation breakdown.',
      keyword: 'college',
      onCSV: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const c = p.college || 'Other';
            if (!counts[c]) counts[c] = { participants: 0, events: new Set() };
            counts[c].participants++;
            p.registeredEvents?.forEach((eid) => counts[c].events.add(eid));
          });
          const rows = Object.entries(counts).map(([college, data]) => ({
            'College Name': college,
            'Number of Participants': data.participants,
            'Events Participated': data.events.size,
          }));
          downloadCSV(rows, `college_wise_${ts}.csv`);
        }, 'College-wise Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const c = p.college || 'Other';
            if (!counts[c]) counts[c] = { participants: 0, events: new Set() };
            counts[c].participants++;
            p.registeredEvents?.forEach((eid) => counts[c].events.add(eid));
          });
          const headers = ['College Name', 'Number of Participants', 'Events Participated'];
          const rows = Object.entries(counts).map(([college, data]) => [college, data.participants, data.events.size]);
          downloadExcel(headers, rows, `college_wise_${ts}.xlsx`);
        }, 'College-wise Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const c = p.college || 'Other';
            if (!counts[c]) counts[c] = { participants: 0, events: new Set() };
            counts[c].participants++;
            p.registeredEvents?.forEach((eid) => counts[c].events.add(eid));
          });
          const headers = ['College Name', 'Participants', 'Events'];
          const rows = Object.entries(counts).map(([college, data]) => [college, data.participants, data.events.size]);
          downloadPDF('College-wise Report', headers, rows, `college_wise_${ts}`);
        }, 'College-wise Report PDF'),
    },
    {
      id: 'dept-wise',
      icon: GraduationCap,
      iconBg: 'bg-pink-500/10 text-pink-400',
      title: 'Department-wise Report',
      description: 'Department-wise participant distribution and registered event counts.',
      keyword: 'department',
      onCSV: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const d = p.department || 'Other';
            if (!counts[d]) counts[d] = { participants: 0, events: new Set() };
            counts[d].participants++;
            p.registeredEvents?.forEach((eid) => counts[d].events.add(eid));
          });
          const rows = Object.entries(counts).map(([dept, data]) => ({
            'Department': dept,
            'Total Participants': data.participants,
            'Registered Events': data.events.size,
          }));
          downloadCSV(rows, `department_wise_${ts}.csv`);
        }, 'Department-wise Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const d = p.department || 'Other';
            if (!counts[d]) counts[d] = { participants: 0, events: new Set() };
            counts[d].participants++;
            p.registeredEvents?.forEach((eid) => counts[d].events.add(eid));
          });
          const headers = ['Department', 'Total Participants', 'Registered Events'];
          const rows = Object.entries(counts).map(([dept, data]) => [dept, data.participants, data.events.size]);
          downloadExcel(headers, rows, `department_wise_${ts}.xlsx`);
        }, 'Department-wise Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const filtered = applyFilters(participants);
          const counts: Record<string, { participants: number; events: Set<string> }> = {};
          filtered.forEach((p) => {
            const d = p.department || 'Other';
            if (!counts[d]) counts[d] = { participants: 0, events: new Set() };
            counts[d].participants++;
            p.registeredEvents?.forEach((eid) => counts[d].events.add(eid));
          });
          const headers = ['Department', 'Participants', 'Events'];
          const rows = Object.entries(counts).map(([dept, data]) => [dept, data.participants, data.events.size]);
          downloadPDF('Department-wise Report', headers, rows, `department_wise_${ts}`);
        }, 'Department-wise Report PDF'),
    },
    {
      id: 'event-summary',
      icon: Trophy,
      iconBg: 'bg-rose-500/10 text-rose-400',
      title: 'Event Summary Report',
      description: 'One report per event with coordinators, venue, capacity, and attendance counts.',
      keyword: 'event summary',
      onCSV: () =>
        wrapExport(() => {
          const rows = events.map((e) => ({
            'Event Name': e.name,
            'Coordinator(s)': `${e.facultyCoordinator}${e.studentCoordinator ? ` / ${e.studentCoordinator}` : ''}`,
            'Venue': e.venue,
            'Date': e.date,
            'Registration Count': e.registeredCount,
            'Attendance Count': attendance.filter((a) => a.eventId === e.id && a.status === 'Present').length,
            'Available Seats': e.maxParticipants - e.registeredCount,
          }));
          downloadCSV(rows, `event_summary_${ts}.csv`);
        }, 'Event Summary CSV'),
      onExcel: () =>
        wrapExport(() => {
          const headers = ['Event Name', 'Coordinator(s)', 'Venue', 'Date', 'Registration Count', 'Attendance Count', 'Available Seats'];
          const rows = events.map((e) => [
            e.name,
            `${e.facultyCoordinator}${e.studentCoordinator ? ` / ${e.studentCoordinator}` : ''}`,
            e.venue,
            e.date,
            e.registeredCount,
            attendance.filter((a) => a.eventId === e.id && a.status === 'Present').length,
            e.maxParticipants - e.registeredCount,
          ]);
          downloadExcel(headers, rows, `event_summary_${ts}.xlsx`);
        }, 'Event Summary Excel'),
      onPDF: () =>
        wrapExport(() => {
          const headers = ['Event', 'Coordinator(s)', 'Venue', 'Date', 'Registrations', 'Attendance', 'Available Seats'];
          const rows = events.map((e) => [
            e.name,
            `${e.facultyCoordinator}${e.studentCoordinator ? ` / ${e.studentCoordinator}` : ''}`,
            e.venue,
            e.date,
            e.registeredCount,
            attendance.filter((a) => a.eventId === e.id && a.status === 'Present').length,
            e.maxParticipants - e.registeredCount,
          ]);
          downloadPDF('Event Summary Report', headers, rows, `event_summary_${ts}`);
        }, 'Event Summary PDF'),
    },
    {
      id: 'certificates',
      icon: Award,
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      title: 'Certificates Report',
      description: 'Issued certificates with unique IDs, issue dates, and verification status.',
      keyword: 'certificates',
      onCSV: () =>
        wrapExport(() => {
          const rows = certificates.map((c) => ({
            'Participant': c.participantName,
            'Event': c.eventName || 'N/A',
            'Certificate ID': c.certificateCode,
            'Issue Date': c.issueDate,
            'Certificate Status': c.type,
          }));
          downloadCSV(rows, `certificates_${ts}.csv`);
        }, 'Certificates Report CSV'),
      onExcel: () =>
        wrapExport(() => {
          const headers = ['Participant', 'Event', 'Certificate ID', 'Issue Date', 'Certificate Status'];
          const rows = certificates.map((c) => [c.participantName, c.eventName || 'N/A', c.certificateCode, c.issueDate, c.type]);
          downloadExcel(headers, rows, `certificates_${ts}.xlsx`);
        }, 'Certificates Report Excel'),
      onPDF: () =>
        wrapExport(() => {
          const headers = ['Participant', 'Event', 'Certificate ID', 'Issue Date', 'Status'];
          const rows = certificates.map((c) => [c.participantName, c.eventName || 'N/A', c.certificateCode, c.issueDate, c.type]);
          downloadPDF('Certificates Report', headers, rows, `certificates_${ts}`);
        }, 'Certificates Report PDF'),
    },
  ];

  const filteredModules = modules.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.keyword.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 select-none pb-12 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Data Export Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Export Center
          </h2>
          <p className="text-xs text-white/50 mt-1">
            Download reports in CSV, Excel, and PDF formats.
          </p>
        </div>
        <span className="text-[10px] font-mono text-white/30 px-2 py-1 rounded-md bg-white/5 border border-white/10">
          {modules.length} modules
        </span>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search export modules..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-zinc-950/60 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50 backdrop-blur-md"
        />
      </div>

      {/* Filters */}
      <ExportFilters
        events={events}
        colleges={collegeList}
        departments={deptList}
        onApply={setFilters}
      />

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredModules.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 py-16 text-white/40">
            <Search className="w-8 h-8" />
            <p className="text-sm">No export modules match your search.</p>
          </div>
        ) : (
          filteredModules.map((m) => (
            <ExportCard
              key={m.id}
              icon={m.icon}
              iconBg={m.iconBg}
              title={m.title}
              description={m.description}
              onExportCSV={m.onCSV}
              onExportExcel={m.onExcel}
              onExportPDF={m.onPDF}
            />
          ))
        )}
      </div>

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl bg-zinc-950 border ${
              t.type === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
            } shadow-2xl backdrop-blur-xl transition-all duration-300 opacity-100 translate-x-0`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{t.title}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="p-0.5 text-white/30 hover:text-white flex-shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
