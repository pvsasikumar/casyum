import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { motion } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Loader2,
  RotateCw,
  Zap,
  ZapOff,
  Video,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';

interface QRScannerProps {
  onResult: (data: string) => void;
  autoStart?: boolean;
  /** When true, scan results are suppressed (e.g. while a verification request
   * is still being processed) so the same QR cannot be scanned repeatedly. */
  processing?: boolean;
}

/**
 * Professional camera-based QR scanner used by the Registration Team and Event
 * Coordinators. Provides camera selection, front/rear switching, flashlight
 * (when supported) and fully automatic code detection — no manual capture.
 *
 * The camera (and therefore the permission prompt) is only ever requested when
 * the user explicitly clicks a Start/Scan button — never on mount.
 */
export const QRScanner: React.FC<QRScannerProps> = ({ onResult, autoStart = false, processing = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastCodeRef = useRef('');
  const lastCodeTimeRef = useRef(0);
  const processingRef = useRef(false);
  const onResultRef = useRef(onResult);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    processingRef.current = processing;
    // Once the pending request finishes, allow the same QR to be scanned again
    // (used after a failed verification attempt).
    if (!processing) {
      lastCodeRef.current = '';
      lastCodeTimeRef.current = 0;
    }
  }, [processing]);

  const scanLoop = useCallback(() => {
    if (!runningRef.current) return;
    // Suppress decoding while a verification request is being processed so the
    // same QR cannot be re-submitted repeatedly.
    if (processingRef.current) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const width = video.videoWidth;
    const height = video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
      if (code && code.data) {
        const now = Date.now();
        const isDuplicate = code.data === lastCodeRef.current && now - lastCodeTimeRef.current < 3000;
        if (!isDuplicate) {
          lastCodeRef.current = code.data;
          lastCodeTimeRef.current = now;
          onResultRef.current(code.data);
        }
      }
    }
    if (runningRef.current) rafRef.current = requestAnimationFrame(scanLoop);
  }, []);

  const scanLoopRef = useRef(scanLoop);
  useEffect(() => {
    scanLoopRef.current = scanLoop;
  }, [scanLoop]);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setTorchSupported(false);
    setStatus('idle');
  }, []);

  const refreshTorchSupport = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(typeof caps.torch === 'boolean');
    } catch {
      setTorchSupported(false);
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
    } catch {
      // ignore — camera list is a convenience, not a blocker
    }
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setStatus('starting');
      setError('');
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setTorchOn(false);
      setTorchSupported(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        if (track) {
          setActiveDeviceId(track.getSettings().deviceId || '');
        }
        refreshTorchSupport(stream);
        runningRef.current = true;
        setStatus('active');
        rafRef.current = requestAnimationFrame(() => scanLoopRef.current());
        // Device labels are only populated after permission is granted.
        void refreshCameras();
      } catch (err: any) {
        const name = err?.name || '';
        const message =
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Camera permission required.'
            : name === 'NotFoundError'
              ? 'No camera found on this device.'
              : 'Camera access is unavailable. Use manual search instead.';
        setError(message);
        setStatus('error');
      }
    },
    [refreshTorchSupport, refreshCameras]
  );

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (autoStart) {
        await startCamera();
        if (cancelled) return;
      }
      await refreshCameras();
    };
    void init();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera, refreshCameras]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.deviceId === activeDeviceId);
    const next = cameras[(currentIndex + 1) % cameras.length];
    void startCamera(next.deviceId);
  }, [cameras, activeDeviceId, startCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((prev) => !prev);
    } catch {
      // flashlight not available on this track
    }
  }, [torchOn]);

  const isActive = status === 'active';
  const hasMultipleCameras = cameras.length > 1;

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Status / error banner */}
      {status === 'error' && (
        <div className="px-3.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-amber-300">{error}</p>
            <p className="text-[10px] text-amber-200/60 mt-0.5">
              Allow camera access in your browser settings, then retry.
            </p>
          </div>
          <button
            onClick={() => void startCamera()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold cursor-pointer shrink-0"
          >
            <RefreshCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {hasMultipleCameras && (
          <select
            value={activeDeviceId}
            onChange={(e) => void startCamera(e.target.value)}
            className="flex-1 min-w-[140px] bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white/80 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId} className="bg-zinc-900">
                {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        )}

        {hasMultipleCameras && (
          <button
            onClick={switchCamera}
            disabled={!isActive}
            title="Switch Camera"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-[11px] font-bold cursor-pointer disabled:opacity-40"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Switch
          </button>
        )}

        {torchSupported && isActive && (
          <button
            onClick={() => void toggleTorch()}
            title="Toggle Flashlight"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
              torchOn
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
            }`}
          >
            {torchOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {torchOn ? 'Flash Off' : 'Flash'}
          </button>
        )}

        <button
          onClick={() => (isActive ? stopCamera() : void startCamera())}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
            isActive
              ? 'bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300'
              : 'bg-violet-600 hover:bg-violet-700 border border-violet-500/40 text-white'
          }`}
        >
          {status === 'starting' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isActive ? (
            <CameraOff className="w-3.5 h-3.5" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
          {isActive ? 'Stop Scanner' : 'Start Scanner'}
        </button>
      </div>

      {/* Camera preview */}
      <div className="relative w-full aspect-square rounded-3xl overflow-hidden border border-white/15 bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" />

        {!isActive && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              {status === 'starting' ? (
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              ) : (
                <Video className="w-6 h-6 text-violet-400" />
              )}
            </div>
            <p className="text-xs font-bold text-white/70">
              {status === 'starting' ? 'Starting camera...' : 'Scanner is off'}
            </p>
            {!isActive && status === 'idle' && (
              <button
                onClick={() => void startCamera()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                Start Scanner
              </button>
            )}
          </div>
        )}

        {isActive && (
          <>
            {/* Scan guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-[70%] h-[70%]">
                <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-violet-400 rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-violet-400 rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-violet-400 rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-violet-400 rounded-br-lg" />
                <motion.div
                  className="absolute left-2 right-2 h-0.5 rounded-full bg-violet-400/90 shadow-[0_0_12px_rgba(139,92,246,0.9)]"
                  initial={{ top: '0%' }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>

            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 text-[10px] text-white/80">
              <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
              Scanning... point camera at the QR code
            </div>
          </>
        )}
      </div>
    </div>
  );
};
