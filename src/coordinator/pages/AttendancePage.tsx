import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ShieldCheck,
  Search,
  ScanLine,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import { AttendanceTable } from '../components/AttendanceTable';
import { AttendanceSummary } from '../components/AttendanceSummary';
import { AttendanceService } from '../services/AttendanceService';
import { useCoordinator } from '../context/CoordinatorContext';
import { ConfirmationDialog } from '../../admin/components/common/ConfirmationDialog';
import { QRScanner } from '../../components/scanner/QRScanner';
import type { ScannedParticipant, RegisteredEventDetail } from '../../services/participantLookupService';
import {
  checkEventAttendance,
  searchEventAttendance,
  type AttendanceCheck,
} from '../../services/qrVerificationService';
import type {
  ParticipantAttendanceView,
  EventAttendanceStats,
  EventParticipant,
  CoordinatorAttendanceRecord,
} from '../types';
import type { ParticipantVerificationInfo } from '../services/ParticipantService';

interface AttendancePageProps {
  eventId: string;
  eventName: string;
}

interface ScanResultView {
  status: 'success' | 'already_checked_in' | 'not_registered';
  profile: ScannedParticipant;
  checkInTime: string | null;
  registeredEvents: RegisteredEventDetail[];
}

/** Development-only logging for the Event Coordinator attendance flow. No PII
 * (email, phone, payment proof) is ever logged. Stripped from production. */
function devLog(message: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[ATTENDANCE] ${message}`, data ?? {});
  }
}

/** Attendance is only unlocked when the payment is verified by the Faculty
 * Manager AND the participant is verified at the Registration Desk. */
function isAttendanceEligible(p?: Partial<EventParticipant> | null): boolean {
  return !!p && p.attendanceEligibility === true && p.paymentStatus === 'verified' && p.registrationVerificationStatus === 'verified';
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ eventId, eventName }) => {
  const navigate = useNavigate();
  const { user, addToast, assignedEvents } = useCoordinator();
  const [baseParticipants, setBaseParticipants] = useState<EventParticipant[]>([]);
  const [dbAttendance, setDbAttendance] = useState<Record<string, CoordinatorAttendanceRecord>>({});
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, CoordinatorAttendanceRecord>>({});
  const [verificationMap, setVerificationMap] = useState<Record<string, ParticipantVerificationInfo>>({});
  const [clearedOverride, setClearedOverride] = useState(false);
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [registrationsLoaded, setRegistrationsLoaded] = useState(false);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [markAllDialogOpen, setMarkAllDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrTab, setQrTab] = useState<'scan' | 'manual'>('scan');
  const [manualInput, setManualInput] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanResult, setScanResult] = useState<ScanResultView | null>(null);
  const [marking, setMarking] = useState(false);
  const [resumeSignal, setResumeSignal] = useState(0);

  // Firestore real-time listeners for the coordinator's assigned event only.
  useEffect(() => {
    let active = true;

    setBaseParticipants([]);
    setDbAttendance({});
    setPendingAttendance({});
    setVerificationMap({});
    setClearedOverride(false);
    setSavingIds({});
    setRegistrationsLoaded(false);
    setAttendanceLoaded(false);
    setIsLoading(true);

    const unsubscribeAttendance = AttendanceService.subscribeAttendance(
      eventId,
      (records) => {
        if (!active) return;
        setDbAttendance(AttendanceService.latestPerParticipant(records));
        setAttendanceLoaded(true);
      },
      (error) => {
        console.error('Attendance listener failed:', error);
        if (active) {
          setAttendanceLoaded(true);
          addToast('Sync Error', 'Could not load attendance. Check your connection.', 'error');
        }
      }
    );

    const unsubscribeRegistrations = AttendanceService.subscribeRegistrations(
      eventId,
      (participants) => {
        if (!active) return;
        setBaseParticipants(participants);
        setRegistrationsLoaded(true);
      },
      (error) => {
        console.error('Registrations listener failed:', error);
        if (active) {
          setRegistrationsLoaded(true);
          addToast('Sync Error', 'Could not load participants. Check your connection.', 'error');
        }
      }
    );

    const unsubscribeVerifications = AttendanceService.subscribeVerifications(
      (byId) => {
        if (!active) return;
        setVerificationMap(byId);
      },
      (error) => {
        console.error('Verification listener failed:', error);
        if (active) addToast('Sync Error', 'Could not load verification status. Check your connection.', 'error');
      }
    );

    return () => {
      active = false;
      unsubscribeAttendance();
      unsubscribeRegistrations();
      unsubscribeVerifications();
    };
  }, [eventId, addToast]);

  useEffect(() => {
    if (registrationsLoaded && attendanceLoaded) {
      setIsLoading(false);
    }
  }, [registrationsLoaded, attendanceLoaded]);

  // Drop optimistic records once Firestore confirms them, so local state never
  // diverges from the real-time source of truth.
  useEffect(() => {
    setPendingAttendance((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const participantId of Object.keys(prev)) {
        const record = prev[participantId];
        const dbRecord = dbAttendance[participantId];
        if (
          dbRecord &&
          AttendanceService.normalizeAttendanceStatus(dbRecord.status) ===
            AttendanceService.normalizeAttendanceStatus(record.status) &&
          String(dbRecord.updatedAt || '') >= String(record.updatedAt || '')
        ) {
          delete next[participantId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [dbAttendance]);

  // Once the cleared state is confirmed by Firestore (no attendance docs left),
  // remove the temporary override so real-time updates continue to flow.
  useEffect(() => {
    if (clearedOverride && Object.keys(dbAttendance).length === 0) {
      setClearedOverride(false);
    }
  }, [dbAttendance, clearedOverride]);

  // Single source of truth: merge base participants with attendance status and
  // verification status (locked until Verified at the Registration Desk).
  const viewParticipants = useMemo<ParticipantAttendanceView[]>(() => {
    return baseParticipants.map((participant) => {
      const pending = pendingAttendance[participant.participantId];
      const db = clearedOverride ? undefined : dbAttendance[participant.participantId];
      const record = pending || db;
      const verification = verificationMap[participant.participantId];
      return {
        ...participant,
        ...(verification
          ? { verificationStatus: verification.verificationStatus, verifiedBy: verification.verifiedBy }
          : {}),
        attendanceStatus: record
          ? AttendanceService.normalizeAttendanceStatus(record.status)
          : 'Not Marked',
      } as ParticipantAttendanceView;
    });
  }, [baseParticipants, dbAttendance, pendingAttendance, clearedOverride, verificationMap]);

  const unverifiedCount = useMemo(
    () => viewParticipants.filter((p) => !isAttendanceEligible(p)).length,
    [viewParticipants]
  );

  const isVerified = useCallback(
    (participantId: string): boolean => {
      const participant = viewParticipants.find((p) => p.participantId === participantId);
      return isAttendanceEligible(participant);
    },
    [viewParticipants]
  );

  const lockedToast = useCallback(() => {
    addToast(
      'Attendance Locked',
      'Both the payment and registration desk verification must be completed before marking attendance.',
      'warning'
    );
  }, [addToast]);

  // All summary values derive from the same rendered participants state.
  const stats = useMemo<EventAttendanceStats>(() => {
    const totalRegistered = viewParticipants.length;
    const verified = viewParticipants.filter((p) => isAttendanceEligible(p)).length;
    const present = viewParticipants.filter(
      (p) => AttendanceService.normalizeAttendanceStatus(p.attendanceStatus) === 'Present'
    ).length;
    const absent = viewParticipants.filter(
      (p) => AttendanceService.normalizeAttendanceStatus(p.attendanceStatus) === 'Absent'
    ).length;
    const percentage = totalRegistered > 0 ? Math.round((present / totalRegistered) * 100) : 0;
    return {
      totalRegistered,
      verified,
      pendingVerification: Math.max(0, totalRegistered - verified),
      present,
      absent,
      percentage,
    };
  }, [viewParticipants]);

  const updateAttendance = useCallback(
    async (participantId: string, newStatus: 'Present' | 'Absent', casyumId?: string): Promise<boolean> => {
      if (!user) return false;
      if (savingIds[participantId]) return false;
      if (!isVerified(participantId)) {
        lockedToast();
        return false;
      }

      const existing = pendingAttendance[participantId] || dbAttendance[participantId];
      const record = AttendanceService.createRecord(
        eventId,
        participantId,
        user.id,
        newStatus,
        existing,
        casyumId
      );

      // Optimistic UI update — never wait for Firebase.
      setPendingAttendance((prev) => ({ ...prev, [participantId]: record }));
      setSavingIds((prev) => ({ ...prev, [participantId]: true }));
      setClearedOverride(false);

      try {
        await AttendanceService.writeAttendance(record);
        return true;
      } catch (error) {
        console.error('Attendance update failed', error);
        setPendingAttendance((prev) => {
          const next = { ...prev };
          delete next[participantId];
          return next;
        });
        addToast('Update Failed', 'Unable to update attendance. Please try again.', 'error');
        return false;
      } finally {
        setSavingIds((prev) => {
          const next = { ...prev };
          delete next[participantId];
          return next;
        });
      }
    },
    [user, eventId, savingIds, pendingAttendance, dbAttendance, isVerified, lockedToast, addToast]
  );

  const handleMarkPresent = useCallback(
    async (participantId: string) => {
      const ok = await updateAttendance(participantId, 'Present');
      if (ok) addToast('Attendance Updated', 'Marked as Present', 'success');
    },
    [updateAttendance, addToast]
  );

  const handleMarkAbsent = useCallback(
    async (participantId: string) => {
      const ok = await updateAttendance(participantId, 'Absent');
      if (ok) addToast('Attendance Updated', 'Marked as Absent', 'info');
    },
    [updateAttendance, addToast]
  );

  const handleMarkAllPresent = useCallback(async () => {
    if (!user || viewParticipants.length === 0) return;

    // Attendance stays locked for ineligible participants: only participants
    // with verified payment + desk verification can be marked in bulk.
    const eligibleParticipants = viewParticipants.filter((p) => isAttendanceEligible(p));
    if (eligibleParticipants.length === 0) {
      lockedToast();
      setMarkAllDialogOpen(false);
      return;
    }
    const participantIds = eligibleParticipants.map((p) => p.participantId);

    setPendingAttendance((prev) => {
      const next = { ...prev };
      eligibleParticipants.forEach((p) => {
        const existing = prev[p.participantId] || dbAttendance[p.participantId];
        next[p.participantId] = AttendanceService.createRecord(
          eventId,
          p.participantId,
          user.id,
          'Present',
          existing
        );
      });
      return next;
    });
    setClearedOverride(false);
    setMarkAllDialogOpen(false);

    try {
      await AttendanceService.markAllPresent(eventId, user.id, participantIds);
      const skipped = viewParticipants.length - eligibleParticipants.length;
      addToast(
        'All Marked',
        skipped > 0
          ? `${eligibleParticipants.length} eligible participants marked Present (${skipped} locked)`
          : 'All eligible participants marked as Present',
        'success'
      );
    } catch (error) {
      console.error('Mark all present failed', error);
      setPendingAttendance((prev) => {
        const next = { ...prev };
        participantIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      addToast('Update Failed', 'Unable to mark all present. Please try again.', 'error');
    }
  }, [user, eventId, viewParticipants, dbAttendance, lockedToast, addToast]);

  const handleClearAttendance = useCallback(async () => {
    setClearedOverride(true);
    setPendingAttendance({});
    setClearDialogOpen(false);

    try {
      await AttendanceService.clearAttendance(eventId);
      addToast('Attendance Cleared', 'All attendance records have been cleared', 'success');
    } catch (error) {
      console.error('Clear attendance failed', error);
      setClearedOverride(false);
      addToast(
        'Clear Failed',
        'Unable to clear attendance. Please check your connection and try again.',
        'error'
      );
    }
  }, [eventId, addToast]);

  const handleSave = useCallback(() => {
    setSaveDialogOpen(true);
  }, []);

  const confirmSave = useCallback(async () => {
    setSaveDialogOpen(false);
    if (!user) return;
    const records = viewParticipants
      .filter((p) => isAttendanceEligible(p))
      .filter((p) => AttendanceService.normalizeAttendanceStatus(p.attendanceStatus) !== 'Not Marked')
      .map((p) => ({
        participantId: p.participantId,
        status: AttendanceService.normalizeAttendanceStatus(p.attendanceStatus) as 'Present' | 'Absent',
      }));
    try {
      await AttendanceService.saveAttendanceBatch(records, eventId, user.id);
      addToast(
        'Attendance Saved',
        `${records.length} attendance records saved successfully`,
        'success'
      );
    } catch (error) {
      console.error('Save attendance failed', error);
      addToast('Save Failed', 'Unable to save attendance. Please try again.', 'error');
    }
  }, [eventId, user, viewParticipants, addToast]);

  const handleScanNext = useCallback(() => {
    setScanResult(null);
    setScanError('');
    setScanBusy(false);
    setMarking(false);
    setResumeSignal((signal) => signal + 1);
  }, []);

  /**
   * Event Coordinator QR attendance flow. The scanner pauses immediately on
   * detection (the QRScanner's `processing` prop stays true while this runs),
   * so nothing re-scans until "Scan Next Participant" explicitly resumes it.
   * Attendance is written atomically and awaited before any success is shown.
   */
  const runAttendanceCheck = useCallback(
    async (identifier: string, searchFirst: boolean) => {
      if (!user) {
        setScanError('You are not assigned to this event.');
        return;
      }
      setScanBusy(true);
      setMarking(false);
      setScanError('');
      setScanResult(null);
      try {
        // [ATTENDANCE] QR decoded (identifier only — never PII)
        devLog('QR decoded', { identifier });
        devLog('Selected event ID', { eventId });
        devLog('Coordinator ID', { coordinatorId: user.id });

        // Validate coordinator event access: only assigned events may be marked.
        const isAssigned = assignedEvents.some((e) => String(e.id) === String(eventId));
        if (!isAssigned) {
          devLog('Event assignment validated', { assigned: false });
          setScanError('You are not assigned to this event.');
          return;
        }
        devLog('Event assignment validated', { assigned: true });

        // [ATTENDANCE] Participant resolved (payment + desk gates also checked).
        let check: AttendanceCheck = await checkEventAttendance(eventId, identifier);
        if (searchFirst && !check.profile) {
          check = await searchEventAttendance(eventId, identifier);
        }
        devLog('Participant resolved', { participantFound: check.profile !== null });
        if (!check.profile) {
          const message = /invalid/i.test(check.message) ? 'Invalid QR Code' : 'Participant Not Found';
          setScanError(message);
          return;
        }
        const profile = check.profile;
        devLog('Participant ID', { participantId: profile.id });

        // [ATTENDANCE] Participant event registration validated.
        if (!check.registered) {
          devLog('Participant event registration validated', { registered: false });
          setScanResult({
            status: 'not_registered',
            profile,
            checkInTime: null,
            registeredEvents: check.registeredEvents || [],
          });
          return;
        }
        devLog('Participant event registration validated', { registered: true });

        // [ATTENDANCE] Payment validated.
        if (!check.paymentVerified) {
          devLog('Payment validated', { verified: false });
          setScanError('Payment Not Verified\nFaculty Coordinator approval is required.');
          return;
        }
        devLog('Payment validated', { verified: true });

        // [ATTENDANCE] Registration Team verification validated.
        if (!check.deskVerified || !check.eligible) {
          devLog('Registration verification validated', { verified: false });
          setScanError(
            'Registration Verification Pending\nPlease complete verification at the Registration Desk.'
          );
          return;
        }
        devLog('Registration verification validated', { verified: true });

        // [ATTENDANCE] Existing attendance checked + atomic Firestore write.
        setMarking(true);
        devLog('Firestore write started', { participantId: profile.id, eventId });
        const attendanceResult = await AttendanceService.markAttendance({
          eventId,
          participantId: profile.id,
          casyumId: profile.casyumId,
          coordinatorId: user.id,
        });
        devLog('Firestore write completed', {
          created: attendanceResult.created,
          participantId: profile.id,
          eventId,
        });

        if (!attendanceResult.created) {
          devLog('Attendance result', { status: 'already_checked_in' });
          setScanResult({
            status: 'already_checked_in',
            profile,
            checkInTime: attendanceResult.existing?.checkInTime ?? null,
            registeredEvents: check.registeredEvents || [],
          });
          return;
        }
        devLog('Attendance result', { status: 'success' });
        setScanResult({
          status: 'success',
          profile,
          checkInTime: attendanceResult.record?.checkInTime ?? null,
          registeredEvents: check.registeredEvents || [],
        });
      } catch (error) {
        devLog('Attendance write failed', { error: String((error as Error)?.message || error) });
        console.error('[ATTENDANCE] attendance write failed', error);
        setScanError('Attendance could not be saved.\nPlease check the connection and try again.');
      } finally {
        setMarking(false);
        setScanBusy(false);
      }
    },
    [user, eventId, assignedEvents]
  );

  const processScanData = useCallback(
    (data: string) => {
      if (scanBusy || marking) return;
      void runAttendanceCheck(data, false);
    },
    [runAttendanceCheck, scanBusy, marking]
  );

  const handleManualSearch = useCallback(async () => {
    const query = manualInput.trim();
    if (!query) {
      setScanError('Enter a name, email, phone or registration ID first.');
      return;
    }
    await runAttendanceCheck(query, true);
  }, [manualInput, runAttendanceCheck]);

  const closeQrDialog = useCallback(() => {
    setQrDialogOpen(false);
    setQrTab('scan');
    setManualInput('');
    setScanBusy(false);
    setMarking(false);
    setScanError('');
    setScanResult(null);
  }, []);

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
        <AttendanceSummary stats={stats} isLoading={isLoading} />

        {/* Verification lock banner */}
        {unverifiedCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-300">
                Attendance locked for {unverifiedCount} participant{unverifiedCount === 1 ? '' : 's'}
              </p>
              <p className="text-[11px] text-amber-200/60 mt-0.5">
                Attendance unlocks only after the participant's payment is verified by the Faculty Coordinator AND their registration is verified at the desk. Unlocks automatically once both are complete.
              </p>
            </div>
            <ShieldCheck className="w-4 h-4 text-amber-400/50 shrink-0 hidden sm:block" />
          </div>
        )}

        {/* Attendance Table */}
        <AttendanceTable
          participants={viewParticipants}
          isLoading={isLoading}
          savingIds={savingIds}
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
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-base font-bold font-display text-white">QR Check-In</h3>
                  <span className="text-[10px] text-white/40 truncate">{eventName}</span>
                </div>
              </div>
              <button
                onClick={closeQrDialog}
                className="p-1.5 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modes: Scanner / Manual Search */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
              <button
                onClick={() => { setQrTab('scan'); setScanError(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  qrTab === 'scan'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-white/50 hover:text-white border border-transparent'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                QR Scanner
              </button>
              <button
                onClick={() => { setQrTab('manual'); setScanError(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  qrTab === 'manual'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-white/50 hover:text-white border border-transparent'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Manual Search
              </button>
            </div>

            {qrTab === 'scan' ? (
              <>
                <p className="text-[11px] text-white/40">
                  Point the camera at a participant's QR code. The QR only encodes a unique registration token — all
                  details are fetched securely from Firestore after scanning.
                </p>
                <QRScanner
                  onResult={processScanData}
                  processing={scanBusy || marking}
                  autoResumeAfterProcessing={false}
                  resumeSignal={resumeSignal}
                />
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-white/40">
                  Enter the participant's name, email, phone or registration ID to fetch their details and check them
                  in.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => { setManualInput(e.target.value); setScanError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleManualSearch(); }}
                    placeholder="Name, email, phone or registration ID..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={() => void handleManualSearch()}
                    disabled={scanBusy || !manualInput.trim()}
                    className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </div>
              </div>
            )}

            {scanBusy && !marking && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <div>
                  <p className="font-bold text-cyan-300">QR Captured</p>
                  <p className="text-[10px] text-cyan-200/60 mt-0.5">Verifying participant...</p>
                </div>
              </div>
            )}

            {marking && (
              <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <div>
                  <p className="font-bold text-emerald-300">Marking Attendance</p>
                  <p className="text-[10px] text-emerald-200/60 mt-0.5">Saving to Firestore...</p>
                </div>
              </div>
            )}

            {scanError && (
              <div className="flex flex-col gap-3 px-3.5 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs whitespace-pre-line">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-rose-300">{scanError}</span>
                </div>
                <button
                  onClick={handleScanNext}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  {qrTab === 'scan' ? 'Scan Next Participant' : 'New Search'}
                </button>
              </div>
            )}

            {scanResult && (
              <ScanOutcomeCard
                result={scanResult}
                eventName={eventName}
                buttonLabel={qrTab === 'scan' ? 'Scan Next Participant' : 'New Search'}
                onScanNext={handleScanNext}
              />
            )}
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

const ScanResultRow: React.FC<{ label: string; value: string; valueCls?: string }> = ({ label, value, valueCls }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <span className="text-white/40 shrink-0">{label}</span>
    <span className={`text-white/80 text-right truncate ${valueCls || ''}`}>{value}</span>
  </div>
);

/** Result card shown after the Event Coordinator scan flow completes. The
 * scanner stays paused until "Scan Next Participant" is pressed. */
const ScanOutcomeCard: React.FC<{
  result: ScanResultView;
  eventName: string;
  buttonLabel: string;
  onScanNext: () => void;
}> = ({ result, eventName, buttonLabel, onScanNext }) => {
  const { status, profile, checkInTime, registeredEvents } = result;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.03] overflow-hidden">
      {/* Profile header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 p-[1px] shrink-0">
          {profile.profilePicture ? (
            <img
              src={profile.profilePicture}
              alt={profile.fullName}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-[15px] object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-sm font-bold text-cyan-300">
              {profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{profile.fullName || 'Participant'}</p>
          <p className="text-[10px] text-white/40 font-mono truncate">{profile.registrationId || profile.participantId}</p>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2.5 p-4">
        {profile.casyumId && <ScanResultRow label="CASYUM ID" value={profile.casyumId} valueCls="text-cyan-300 font-mono font-bold" />}
        <ScanResultRow label="Registration ID" value={profile.registrationId || profile.participantId || '—'} />
        <ScanResultRow label="Selected Event" value={eventName} />
      </div>

      {/* Outcome */}
      {status === 'success' && (
        <div className="mx-4 mb-4 flex flex-col gap-2.5 px-4 py-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="text-lg font-black text-emerald-300 tracking-wider">ATTENDANCE MARKED</span>
          </div>
          <p className="text-[11px] text-emerald-200/70">
            {checkInTime ? `Checked in at ${checkInTime}` : 'Attendance saved to Firestore.'}
          </p>
        </div>
      )}

      {status === 'already_checked_in' && (
        <div className="mx-4 mb-4 flex flex-col gap-2.5 px-4 py-5 rounded-2xl bg-violet-500/15 border border-violet-500/40 text-center">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-violet-400" />
            <span className="text-lg font-black text-violet-300 tracking-wider">ALREADY CHECKED IN</span>
          </div>
          <p className="text-[11px] text-violet-200/70">
            {checkInTime ? `Attendance was recorded at ${checkInTime}.` : 'Attendance was recorded earlier.'}
          </p>
        </div>
      )}

      {status === 'not_registered' && (
        <div className="mx-4 mb-4 flex flex-col gap-2.5 px-4 py-5 rounded-2xl bg-rose-500/15 border border-rose-500/40">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-black text-rose-300">Participant is not registered for this event.</span>
              <span className="text-[11px] text-rose-200/70">Scanned against: {eventName}</span>
            </div>
          </div>
          {registeredEvents.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-[10px] text-white/50">Registered for:</span>
              {registeredEvents.map((e) => (
                <span key={e.eventId} className="flex items-center gap-1.5 text-emerald-300 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  {e.name}
                  {e.date || e.time ? ` — ${[e.date, e.time].filter(Boolean).join(' · ')}` : ''}
                  {e.venue ? ` (${e.venue})` : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={onScanNext}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCcw className="w-4 h-4" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};
