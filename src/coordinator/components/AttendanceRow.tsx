import React from 'react';
import { CheckCircle2, XCircle, Lock, Clock, ShieldAlert } from 'lucide-react';
import type { ParticipantAttendanceView, VerificationStatus } from '../types';

interface AttendanceRowProps {
  participant: ParticipantAttendanceView;
  locked?: boolean;
  isSaving?: boolean;
  onMarkPresent: (participantId: string) => void;
  onMarkAbsent: (participantId: string) => void;
}

const VERIFICATION_BADGE: Record<
  VerificationStatus,
  { label: string; cls: string; icon: React.ElementType }
> = {
  Pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
  Verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  Rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: ShieldAlert },
};

export const AttendanceRow: React.FC<AttendanceRowProps> = ({
  participant,
  locked = false,
  isSaving = false,
  onMarkPresent,
  onMarkAbsent,
}) => {
  const isPresent = participant.attendanceStatus === 'Present';
  const isAbsent = participant.attendanceStatus === 'Absent';
  const badge = VERIFICATION_BADGE[participant.verificationStatus] || VERIFICATION_BADGE.Pending;
  const BadgeIcon = badge.icon;

  return (
    <tr className="hover:bg-white/5 transition-all">
      <td className="p-3 font-mono text-[11px] text-white/60">
        {participant.registrationId}
      </td>
      <td className="p-3 font-mono text-[11px] text-white/60">
        {participant.participantId}
      </td>
      <td className="p-3">
        <span className="font-bold text-white text-xs">{participant.participantName}</span>
      </td>
      <td className="p-3 text-[11px] text-white/70">{participant.college}</td>
      <td className="p-3 text-[11px] text-white/70">{participant.city || '—'}</td>
      <td className="p-3 text-[11px] text-white/70">{participant.department}</td>
      <td className="p-3 font-mono text-[11px] text-white/60">{participant.phoneNumber}</td>
      <td className="p-3">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            participant.registrationStatus === 'Confirmed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : participant.registrationStatus === 'Pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}
        >
          {participant.registrationStatus}
        </span>
      </td>
      <td className="p-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
      </td>
      <td className="p-3">
        {locked ? (
          <div className="flex items-center gap-1.5 text-white/30">
            <Lock className="w-3.5 h-3.5 text-amber-400/70" />
            <span className="text-[10px] font-semibold">Locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onMarkPresent(participant.participantId)}
              disabled={isSaving}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isPresent
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border border-transparent hover:border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Present</span>
            </button>
            <button
              onClick={() => onMarkAbsent(participant.participantId)}
              disabled={isSaving}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isAbsent
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-rose-500/20 text-rose-400 border border-transparent hover:border-rose-500/30'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Absent</span>
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};
