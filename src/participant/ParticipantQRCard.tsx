import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QrCode, BadgeCheck, Clock, XCircle, Download, Maximize2, X } from 'lucide-react';
import { generateQRMatrix, drawQRToCanvas, encodeParticipantQR } from '../lib/qr';

interface ParticipantQRCardProps {
  participantId: string;
  registrationId?: string;
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

/** Minimum render resolution for the participant pass (device pixels). */
const QR_TARGET_PX = 1024;

/**
 * Draws the participant pass QR at high resolution onto its own canvas.
 * Reused by both the card and the full-screen view so each keeps its own
 * rendering and the two never fight over the same DOM node.
 */
const PassQRCanvas: React.FC<{ payload: string; ref?: React.Ref<HTMLCanvasElement> }> = ({
  payload,
  ref,
}) => {
  const ownRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ownRef.current;
    if (!canvas) return;
    const matrix = generateQRMatrix(payload);
    drawQRToCanvas(canvas, matrix, { targetSize: QR_TARGET_PX });
  }, [payload]);

  return (
    <canvas
      ref={(node) => {
        ownRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = node;
      }}
      className="w-full h-auto block"
      style={{
        aspectRatio: '1 / 1',
        imageRendering: 'pixelated',
        display: 'block',
      }}
      role="img"
      aria-label="CASYUM participant registration QR code"
    />
  );
};

export const ParticipantQRCard: React.FC<ParticipantQRCardProps> = ({
  participantId,
  registrationId,
  participantName,
  verificationStatus = 'Pending',
  verifiedBy,
  verifiedAt,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fullScreen, setFullScreen] = useState(false);

  // The QR only encodes a registration token — never participant PII, event
  // objects or React state. The registration id (or participant id as a
  // fallback) is resolved to the full profile server-side after scanning.
  const payload = encodeParticipantQR(registrationId || participantId);

  const downloadQR = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `casyum-pass-${registrationId || participantId}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, [participantId, registrationId]);

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

      <div className="w-full max-w-[340px] mx-auto bg-white rounded-xl p-3 sm:p-4">
        <PassQRCanvas payload={payload} ref={canvasRef} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={downloadQR}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Download QR
        </button>
        <button
          type="button"
          onClick={() => setFullScreen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          View Full Screen
        </button>
      </div>

      <div className="w-full flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-bold text-white truncate max-w-full">{participantName}</span>
        <span className="text-[10px] text-white/40 font-mono">{registrationId || participantId}</span>
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

      {fullScreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="QR code full screen"
          >
            <div className="relative flex flex-col items-center gap-4 w-full max-w-[min(90vw,560px)]">
              <div className="w-full bg-white rounded-2xl p-4 sm:p-6">
                <PassQRCanvas payload={payload} />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download QR
                </button>
                <button
                  type="button"
                  onClick={() => setFullScreen(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
