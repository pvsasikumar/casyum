import React, { useEffect, useRef } from 'react';
import { QrCode, BadgeCheck, Clock, XCircle } from 'lucide-react';
import { generateQRMatrix, drawQRToCanvas } from '../lib/qr';

interface ParticipantQRCardProps {
  participantId: string;
  participantName: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  Verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: BadgeCheck },
  Rejected: { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle },
  Pending: { label: 'Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
};

export const ParticipantQRCard: React.FC<ParticipantQRCardProps> = ({
  participantId,
  participantName,
  verificationStatus = 'Pending',
  verifiedBy,
  verifiedAt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const payload = `casyum:reg:${participantId}`;

  useEffect(() => {
    if (!canvasRef.current) return;
    const matrix = generateQRMatrix(payload);
    drawQRToCanvas(canvasRef.current, matrix, 8, '#111111', '#ffffff');
  }, [payload]);

  const badge = STATUS_BADGE[verificationStatus] || STATUS_BADGE.Pending;
  const BadgeIcon = badge.icon;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Registration Pass</span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border ${badge.cls}`}>
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
      </div>

      <div className="rounded-xl bg-white p-3">
        <canvas ref={canvasRef} className="w-40 h-40 block" />
      </div>

      <div className="w-full flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-bold text-white truncate max-w-full">{participantName}</span>
        <span className="text-[10px] text-white/40 font-mono">{participantId}</span>
        {verificationStatus === 'Verified' && (
          <span className="text-[10px] text-emerald-400 mt-1">
            Verified by {verifiedBy || 'Registration Desk'}{verifiedAt ? ` · ${new Date(verifiedAt).toLocaleString()}` : ''}
          </span>
        )}
        {verificationStatus === 'Rejected' && (
          <span className="text-[10px] text-rose-400 mt-1">Show this QR at the desk to be re-verified.</span>
        )}
        {verificationStatus === 'Pending' && (
          <span className="text-[10px] text-amber-400 mt-1">Show this QR at the registration desk to verify.</span>
        )}
      </div>
    </div>
  );
};
