import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AttendanceTable } from '../components/AttendanceTable';
import { AttendanceSummary } from '../components/AttendanceSummary';
import { AttendanceService } from '../services/AttendanceService';
import { useCoordinator } from '../context/CoordinatorContext';
import { ConfirmationDialog } from '../../admin/components/common/ConfirmationDialog';
import type { ParticipantAttendanceView, EventAttendanceStats } from '../types';

interface AttendancePageProps {
  eventId: string;
  eventName: string;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ eventId, eventName }) => {
  const navigate = useNavigate();
  const { user, addToast } = useCoordinator();
  const [participants, setParticipants] = useState<ParticipantAttendanceView[]>([]);
  const [stats, setStats] = useState<EventAttendanceStats>({
    totalRegistered: 0, verified: 0, pendingVerification: 0, present: 0, absent: 0, percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [markAllDialogOpen, setMarkAllDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrError, setQrError] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const data = await AttendanceService.loadEventParticipants(eventId);
    setParticipants(data);
    setStats(AttendanceService.getEventAttendanceStats(eventId, data));
    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkPresent = useCallback(async (participantId: string) => {
    if (!user) return;
    await AttendanceService.markPresent(participantId, eventId, user.id);
    await loadData();
    addToast('Attendance Updated', 'Marked as Present', 'success');
  }, [eventId, user, addToast, loadData]);

  const handleMarkAbsent = useCallback(async (participantId: string) => {
    if (!user) return;
    await AttendanceService.markAbsent(participantId, eventId, user.id);
    await loadData();
    addToast('Attendance Updated', 'Marked as Absent', 'info');
  }, [eventId, user, addToast, loadData]);

  const handleMarkAllPresent = useCallback(async () => {
    if (!user) return;
    await AttendanceService.markAllPresent(eventId, user.id, participants);
    await loadData();
    setMarkAllDialogOpen(false);
    addToast('All Marked', 'All participants marked as Present', 'success');
  }, [eventId, user, participants, addToast, loadData]);

  const handleClearAttendance = useCallback(async () => {
    const cleared = await AttendanceService.clearAttendance(eventId);
    await loadData();
    setClearDialogOpen(false);
    if (cleared) {
      addToast('Attendance Cleared', 'All attendance records have been cleared', 'success');
    } else {
      addToast(
        'Clear Failed',
        'Local records cleared, but the database update failed. Check your connection and try again.',
        'error'
      );
    }
  }, [eventId, addToast, loadData]);

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  const confirmSave = useCallback(async () => {
    setSaveDialogOpen(false);
    if (!user) return;
    const records = participants
      .filter((p) => p.attendanceStatus === 'Present' || p.attendanceStatus === 'Absent')
      .map((p) => ({ participantId: p.participantId, status: p.attendanceStatus as 'Present' | 'Absent' }));
    await AttendanceService.saveAttendanceBatch(records, eventId, user.id);
    await loadData();
    addToast(
      'Attendance Saved',
      `${records.length} attendance records saved successfully`,
      'success'
    );
  }, [eventId, user, participants, addToast, loadData]);

  const handleQRScan = useCallback(async () => {
    if (!qrInput.trim()) {
      setQrError('Please enter or scan a QR code');
      return;
    }

    const data = AttendanceService.decodeQRData(qrInput.trim());
    if (!data || data.eventId !== eventId) {
      setQrError('Invalid QR code for this event');
      return;
    }

    if (AttendanceService.isDuplicateCheckIn(data.participantId, eventId)) {
      setQrError('Participant already checked in');
      return;
    }

    if (!user) return;
    await AttendanceService.markPresent(data.participantId, eventId, user.id);
    await loadData();
    setQrInput('');
    setQrError('');
    addToast('QR Check-In', 'Participant checked in successfully', 'success');
  }, [qrInput, eventId, user, addToast, loadData]);

  const generateQRForParticipant = (participantId: string) => {
    return AttendanceService.generateQRData(participantId, eventId);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-violet-500/30 selection:text-violet-200">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/coordinator/dashboard')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                Attendance Management
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold font-display text-white">
                {eventName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setQrDialogOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>QR Check-In</span>
            </button>
          </div>
        </div>

        {/* Summary */}
        <AttendanceSummary stats={stats} />

        {/* Attendance Table */}
        <AttendanceTable
          participants={participants}
          isLoading={isLoading}
          onMarkPresent={handleMarkPresent}
          onMarkAbsent={handleMarkAbsent}
          onMarkAllPresent={() => setMarkAllDialogOpen(true)}
          onClearAttendance={() => setClearDialogOpen(true)}
          onSave={handleSave}
          eventName={eventName}
        />
      </div>

      {/* QR Check-In Dialog */}
      {qrDialogOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold font-display text-white">QR Check-In</h3>
              </div>
              <button
                onClick={() => { setQrDialogOpen(false); setQrError(''); setQrInput(''); }}
                className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/60">
              Scan participant QR code or paste the QR string below to mark them as Present.
            </p>

            <input
              type="text"
              value={qrInput}
              onChange={(e) => { setQrInput(e.target.value); setQrError(''); }}
              placeholder="Paste QR code data here..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
            />

            {qrError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{qrError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setQrDialogOpen(false); setQrError(''); setQrInput(''); }}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleQRScan}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Check In</span>
              </button>
            </div>

            {/* QR Codes for participants (for testing) */}
            <details className="mt-2">
              <summary className="text-[10px] text-white/40 cursor-pointer hover:text-white/60">
                Show participant QR codes (testing)
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto flex flex-col gap-1">
                {participants.slice(0, 10).map((p) => (
                  <div key={p.participantId} className="flex items-center justify-between px-2 py-1 rounded bg-white/5 text-[9px]">
                    <span className="text-white/70 truncate max-w-[120px]">{p.participantName}</span>
                    <button
                      onClick={() => {
                        setQrInput(generateQRForParticipant(p.participantId));
                        setQrError('');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                    >
                      Copy QR
                    </button>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={saveDialogOpen}
        title="Save Attendance"
        message="Are you sure you want to save all current attendance records? This will update the attendance data."
        confirmLabel="Save"
        cancelLabel="Cancel"
        variant="info"
        onConfirm={confirmSave}
        onCancel={() => setSaveDialogOpen(false)}
      />

      <ConfirmationDialog
        open={clearDialogOpen}
        title="Clear Attendance"
        message="Are you sure you want to clear all attendance records for this event? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleClearAttendance}
        onCancel={() => setClearDialogOpen(false)}
      />

      <ConfirmationDialog
        open={markAllDialogOpen}
        title="Mark All Present"
        message="Are you sure you want to mark all participants as Present?"
        confirmLabel="Mark All"
        cancelLabel="Cancel"
        variant="info"
        onConfirm={handleMarkAllPresent}
        onCancel={() => setMarkAllDialogOpen(false)}
      />

      {/* Toast Container */}
      <ToastContainerCoordinator />
    </div>
  );
};

const ToastContainerCoordinator: React.FC = () => {
  const { toasts, dismissToast } = useCoordinator();
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl bg-zinc-950 border shadow-2xl backdrop-blur-xl transition-all duration-300 opacity-100 ${
              t.type === 'success' ? 'border-emerald-500/30' :
              t.type === 'error' ? 'border-rose-500/30' :
              t.type === 'warning' ? 'border-amber-500/30' :
              'border-cyan-500/30'
            }`}
          >
            <div className="mt-0.5 flex-shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{t.title}</p>
              <p className="text-[11px] text-white/60 mt-0.5">{t.message}</p>
            </div>
            <button onClick={() => dismissToast(t.id)} className="p-0.5 text-white/30 hover:text-white flex-shrink-0 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
