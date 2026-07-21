import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Users,
  Calendar,
  CheckSquare,
  DollarSign,
  Award,
  Building,
  GraduationCap,
  Trophy,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { exportToCSV, exportToPrintableReport } from '../../utils/exportUtils';

interface ExportCardProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const ExportCard: React.FC<ExportCardProps> = ({ icon: Icon, iconColor, title, description, onExportCSV, onExportPDF }) => (
  <div className="p-5 rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 backdrop-blur-md flex flex-col justify-between gap-5 transition-all group">
    <div className="flex items-start gap-4">
      <div className={`p-3 rounded-2xl ${iconColor} border border-white/10 flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[11px] text-white/50 leading-relaxed">{description}</p>
      </div>
    </div>

    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
      <button
        onClick={onExportCSV}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        <span>CSV</span>
      </button>
      <button
        onClick={onExportPDF}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-xs font-bold transition-all cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>PDF</span>
      </button>
    </div>
  </div>
);

export const ExportCenter: React.FC = () => {
  const { participants, events, attendance, certificates } = useAdmin();

  const allParticipantsCSV = () => {
    exportToCSV('CASYUM_All_Participants', participants.map((p) => ({
      ID: p.id, Name: p.name, College: p.college, Department: p.department,
      Year: p.year, RegNo: p.registerNumber, Mobile: p.mobile, Email: p.email,
      Gender: p.gender, PaymentStatus: p.paymentStatus, TxnID: p.transactionId,
      Amount: p.paymentAmount, RegDate: p.registrationDate,
    })));
  };

  const allParticipantsPDF = () => {
    exportToPrintableReport('All Participants Report', ['ID', 'Name', 'College', 'Dept', 'Mobile', 'Email', 'Payment', 'Amount'],
      participants.map((p) => [p.id, p.name, p.college, p.department, p.mobile, p.email, p.paymentStatus, `₹${p.paymentAmount}`])
    );
  };

  const eventWiseCSV = () => {
    events.forEach((e) => {
      const ep = participants.filter((p) => p.registeredEvents?.includes(e.id));
      if (ep.length > 0) {
        exportToCSV(`${e.name.replace(/\s+/g, '_')}_Participants`, ep.map((p) => ({
          ID: p.id, Name: p.name, College: p.college, Department: p.department,
          Mobile: p.mobile, Email: p.email, PaymentStatus: p.paymentStatus,
        })));
      }
    });
  };

  const eventWisePDF = () => {
    events.forEach((e) => {
      const ep = participants.filter((p) => p.registeredEvents?.includes(e.id));
      if (ep.length > 0) {
        exportToPrintableReport(`${e.name} - Participant Roster`, ['ID', 'Name', 'College', 'Mobile', 'Payment'],
          ep.map((p) => [p.id, p.name, p.college, p.mobile, p.paymentStatus])
        );
      }
    });
  };

  const attendanceCSV = () => {
    exportToCSV('CASYUM_Attendance', attendance.map((a) => ({
      ID: a.id, Participant: a.participantName, Event: a.eventName,
      Status: a.status, Timestamp: a.timestamp, CheckedBy: a.checkedBy,
    })));
  };

  const attendancePDF = () => {
    exportToPrintableReport('Attendance Report', ['ID', 'Participant', 'Event', 'Status', 'Time', 'Checked By'],
      attendance.map((a) => [a.id, a.participantName, a.eventName, a.status, a.timestamp, a.checkedBy])
    );
  };

  const revenueCSV = () => {
    exportToCSV('CASYUM_Revenue', events.map((e) => ({
      Event: e.name, Category: e.category, Fee: e.fee, Registered: e.registeredCount,
      MaxCapacity: e.maxParticipants, Revenue: e.revenue, Status: e.status,
    })));
  };

  const revenuePDF = () => {
    exportToPrintableReport('Revenue Report', ['Event', 'Category', 'Fee', 'Registered', 'Revenue', 'Status'],
      events.map((e) => [e.name, e.category, `₹${e.fee}`, e.registeredCount, `₹${e.revenue}`, e.status])
    );
  };

  const paymentCSV = () => {
    exportToCSV('CASYUM_Payments', participants.map((p) => ({
      ID: p.id, Name: p.name, TxnID: p.transactionId, Amount: p.paymentAmount,
      Status: p.paymentStatus, UploadedTime: p.paymentUploadedTime, Remarks: p.paymentRemarks || 'N/A',
    })));
  };

  const paymentPDF = () => {
    exportToPrintableReport('Payment Verification Report', ['ID', 'Name', 'Txn ID', 'Amount', 'Status', 'Upload Time'],
      participants.map((p) => [p.id, p.name, p.transactionId, `₹${p.paymentAmount}`, p.paymentStatus, p.paymentUploadedTime])
    );
  };

  const collegeCSV = () => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => { counts[p.college] = (counts[p.college] || 0) + 1; });
    exportToCSV('CASYUM_Colleges', Object.entries(counts).map(([c, n]) => ({ College: c, Participants: n })));
  };

  const collegePDF = () => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => { counts[p.college] = (counts[p.college] || 0) + 1; });
    exportToPrintableReport('College-wise Participation', ['College', 'Participants'],
      Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, n])
    );
  };

  const deptCSV = () => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => { counts[p.department] = (counts[p.department] || 0) + 1; });
    exportToCSV('CASYUM_Departments', Object.entries(counts).map(([d, n]) => ({ Department: d, Participants: n })));
  };

  const deptPDF = () => {
    const counts: Record<string, number> = {};
    participants.forEach((p) => { counts[p.department] = (counts[p.department] || 0) + 1; });
    exportToPrintableReport('Department-wise Participation', ['Department', 'Participants'],
      Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([d, n]) => [d, n])
    );
  };

  const certCSV = () => {
    exportToCSV('CASYUM_Certificates', certificates.map((c) => ({
      Code: c.certificateCode, Participant: c.participantName, College: c.college,
      Type: c.type, Event: c.eventName || 'N/A', IssueDate: c.issueDate,
    })));
  };

  const certPDF = () => {
    exportToPrintableReport('Certificate Registry', ['Code', 'Participant', 'College', 'Type', 'Event', 'Issued'],
      certificates.map((c) => [c.certificateCode, c.participantName, c.college, c.type, c.eventName || 'N/A', c.issueDate])
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col">
        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
          Data Export Engine
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
          Export Center
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Download comprehensive CSV spreadsheets and printable PDF reports for any module.
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <ExportCard icon={Users} iconColor="bg-violet-500/10 text-violet-400" title="All Participants" description="Complete participant database with contact info, payment status, and registration metadata." onExportCSV={allParticipantsCSV} onExportPDF={allParticipantsPDF} />
        <ExportCard icon={Calendar} iconColor="bg-cyan-500/10 text-cyan-400" title="Event-Wise Rosters" description="Separate participant list for each event with relevant details." onExportCSV={eventWiseCSV} onExportPDF={eventWisePDF} />
        <ExportCard icon={CheckSquare} iconColor="bg-emerald-500/10 text-emerald-400" title="Attendance Logs" description="Full attendance records with timestamps and coordinator check-in data." onExportCSV={attendanceCSV} onExportPDF={attendancePDF} />
        <ExportCard icon={DollarSign} iconColor="bg-green-500/10 text-green-400" title="Revenue Report" description="Event-wise revenue breakdown with fee structures and registration count." onExportCSV={revenueCSV} onExportPDF={revenuePDF} />
        <ExportCard icon={DollarSign} iconColor="bg-amber-500/10 text-amber-400" title="Payment Report" description="Payment verification audit trail with transaction IDs and status history." onExportCSV={paymentCSV} onExportPDF={paymentPDF} />
        <ExportCard icon={Building} iconColor="bg-purple-500/10 text-purple-400" title="College Report" description="Institution-wise participant distribution analysis." onExportCSV={collegeCSV} onExportPDF={collegePDF} />
        <ExportCard icon={GraduationCap} iconColor="bg-pink-500/10 text-pink-400" title="Department Report" description="Department-wise breakdown across all participating institutions." onExportCSV={deptCSV} onExportPDF={deptPDF} />
        <ExportCard icon={Award} iconColor="bg-indigo-500/10 text-indigo-400" title="Certificates Registry" description="All issued certificates with unique codes and participant mapping." onExportCSV={certCSV} onExportPDF={certPDF} />
        <ExportCard icon={Trophy} iconColor="bg-rose-500/10 text-rose-400" title="Winners List" description="Podium finishers and special recognition awardees per event." onExportCSV={() => exportToCSV('CASYUM_Winners', [{ note: 'Winners will be populated after event completion.' }])} onExportPDF={() => exportToPrintableReport('Winners List', ['Note'], [['Winners will be populated after event completion.']])} />
      </div>
    </div>
  );
};
