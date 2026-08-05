import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toDataURL as qrcodeToDataURL } from 'qrcode';
import { QrCode, BadgeCheck, Clock, XCircle, Download, Maximize2, X, Lock } from 'lucide-react';
import { encodeParticipantQR } from '../lib/qr';
import { decodeQRCImage, type QRDiagResult } from '../lib/qrDiag';

interface ParticipantQRCardProps {
  participantId: string;
  casyumId?: string;
  registrationId?: string;
  participantName: string;
  /** Raw payment_status for the registration backing this pass. */
  paymentStatus?: string;
  verificationStatus?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  /** Development-only: decode the rendered QR and compare with the token. */
  devSelfCheck?: boolean;
}

/** Render resolution for the participant pass (device pixels). */
const QR_TARGET_PX = 1024;

const isPaymentVerified = (status?: string): boolean => {
  const s = String(status || '').toLowerCase();
  return s === 'verified' || s === 'not_required';
};

const isPaymentRejected = (status?: string): boolean => String(status || '').toLowerCase() === 'rejected';

/**
 * Renders the participant pass QR at high resolution. The image is generated
 * once with the `qrcode` package (`qrcodeToDataURL`) and reused by both the
 * card and the full-screen view so each keeps its own node.
 */
const PassQRImage: React.FC<{ src: string; ref?: React.Ref<HTMLImageElement> }> = ({ src, ref }) => (
  <img
    ref={ref}
    src={src}
    alt="CASYUM participant registration QR code"
    className="w-full h-auto block"
    style={{
      aspectRatio: '1 / 1',
      imageRendering: 'pixelated',
      display: 'block',
    }}
  />
);

/** Locked placeholder shown until the payment gate passes. */
const LockedPassPlaceholder: React.FC<{ rejected: boolean }> = ({ rejected }) => (
  <div className="w-full aspect-square flex flex-col items-center justify-center gap-3 bg-white/[0.04] rounded-lg">
    <Lock className="w-10 h-10 text-white/25" />
    <p className="text-[10px] text-white/40 text-center px-4 leading-relaxed">
      {rejected
        ? 'Payment rejected. Resubmit your payment to activate your QR pass.'
        : 'Your QR code will appear here once your payment is verified.'}
    </p>
  </div>
);

export const ParticipantQRCard: React.FC<ParticipantQRCardProps> = ({
  participantId,
  casyumId,
  registrationId,
  participantName,
  paymentStatus,
  verificationStatus = 'Pending',
  verifiedBy,
  verifiedAt,
  devSelfCheck = false,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [fullScreen, setFullScreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [diag, setDiag] = useState<QRDiagResult | null>(null);
  const diagContainerId = useRef(`casyum-qr-diag-${Math.random().toString(36).slice(2, 9)}`).current;

  const paymentVerified = isPaymentVerified(paymentStatus);
  const paymentRejected = isPaymentRejected(paymentStatus);

  // The QR encodes exactly the participant's unique CASYUM id (`CAS-02`) —
  // never participant PII, event objects or React state. The id is resolved to
  // the full profile server-side after scanning via
  // `participants where casyum_id == "CAS-02"`.
  const payload = encodeParticipantQR(casyumId || '');

  // Payment gate: the QR is only generated (and therefore only active) after
  // the Faculty Coordinator verifies the payment. No QR is produced while the
  // payment is pending or rejected.
  useEffect(() => {
    if (!paymentVerified || !payload) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    qrcodeToDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: QR_TARGET_PX,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [paymentVerified, payload]);

  // Dev-only self-check: re-decode the rendered QR with an independent decoder
  // (ZXing via html5-qrcode) and compare the decoded value to the token it
  // should carry. Entirely stripped out of production builds (import.meta.env.DEV).
  useEffect(() => {
    if (!import.meta.env.DEV || !devSelfCheck || !paymentVerified || !qrDataUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      decodeQRCImage(img, diagContainerId, casyumId || participantId).then((result) => {
        if (cancelled) return;
        setDiag(result);
        if (import.meta.env.DEV) {
          console.info('[CASYUM QR-DIAG]', result);
        }
      });
    };
    img.src = qrDataUrl;
    return () => {
      cancelled = true;
    };
  }, [devSelfCheck, paymentVerified, qrDataUrl, casyumId, participantId, diagContainerId]);

  const downloadQR = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `casyum-pass-${casyumId || registrationId || participantId}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [qrDataUrl, casyumId, registrationId, participantId]);

  const badge = (() => {
    if (!paymentVerified) {
      return paymentRejected
        ? { label: 'Payment Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle }
        : { label: 'Payment Pending', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock };
    }
    if (verificationStatus === 'Verified') {
      return { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: BadgeCheck };
    }
    if (verificationStatus === 'Rejected') {
      return { label: 'Rejected', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30', icon: XCircle };
    }
    return {
      label: 'Payment Verified — Registration Verification Pending',
      cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: Clock,
    };
  })();
  const BadgeIcon = badge.icon;

  const statusLine = (() => {
    if (!paymentVerified) {
      return paymentRejected
        ? 'Payment rejected. Resubmit your payment to activate your QR pass.'
        : 'Your QR code will appear here once your payment is verified.';
    }
    if (verificationStatus === 'Verified') {
      return (
        <>
          Verified by {verifiedBy || 'Registration Desk'}
          {verifiedAt ? ` · ${new Date(verifiedAt).toLocaleString()}` : ''}
        </>
      );
    }
    if (verificationStatus === 'Rejected') {
      return 'Show this QR at the desk to be re-verified.';
    }
    return 'Payment verified. Show this QR at the registration desk to complete verification.';
  })();

  const showQr = paymentVerified && !!qrDataUrl;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col items-center gap-4">
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Registration Pass</span>
        </div>
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold border text-center leading-tight ${badge.cls}`}>
          <BadgeIcon className="w-3 h-3 shrink-0" />
          {badge.label}
        </span>
      </div>

      <div className="w-full max-w-[340px] mx-auto bg-white rounded-xl p-3 sm:p-4">
        {showQr ? <PassQRImage src={qrDataUrl} ref={imageRef} /> : <LockedPassPlaceholder rejected={paymentRejected} />}
      </div>

      {import.meta.env.DEV && devSelfCheck && diag && (
        <div
          className={`w-full text-center text-[10px] font-bold px-3 py-2 rounded-lg border ${
            diag.matches
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}
        >
          {diag.matches
            ? 'QR self-check PASSED — decoded value matches the participant token.'
            : `QR self-check FAILED — ${diag.error || 'decoded value does not match the participant token.'}`}
        </div>
      )}

      {paymentVerified && (
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
      )}

      <div className="w-full flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-bold text-white truncate max-w-full">{participantName}</span>
        {casyumId && (
          <span className="px-2 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/30 text-[10px] font-bold font-mono text-violet-300 tracking-wide">
            CASYUM ID {casyumId}
          </span>
        )}
        <span className="text-[10px] text-white/40 font-mono">{registrationId || participantId}</span>
        <span className={`text-[10px] mt-1 ${!paymentVerified ? (paymentRejected ? 'text-rose-400' : 'text-amber-400') : verificationStatus === 'Verified' ? 'text-emerald-400' : verificationStatus === 'Rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
          {statusLine}
        </span>
      </div>

      {fullScreen && showQr &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="QR code full screen"
          >
            <div className="relative flex flex-col items-center gap-4 w-full max-w-[min(90vw,560px)]">
              <div className="w-full bg-white rounded-2xl p-4 sm:p-6">
                <PassQRImage src={qrDataUrl} />
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

      {/* Hidden container required by the html5-qrcode decoder constructor. */}
      <div id={diagContainerId} className="hidden" aria-hidden="true" />
    </div>
  );
};
