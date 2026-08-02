import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, Loader2 } from 'lucide-react';

interface QRScannerProps {
  onResult: (data: string) => void;
  enabled?: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onResult, enabled = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  const lastCodeRef = useRef('');
  const lastCodeTimeRef = useRef(0);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      return;
    }
    if (!cameraActive) return;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setError('');
        setCameraActive(true);
        scanLoop();
      } catch {
        setError('Camera access is unavailable. Use manual search instead.');
        setCameraActive(false);
      }
    };

    const scanLoop = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (width === 0 || height === 0) {
        rafRef.current = requestAnimationFrame(scanLoop);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, width, height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          const now = Date.now();
          const isDuplicate = code.data === lastCodeRef.current && now - lastCodeTimeRef.current < 3000;
          if (!isDuplicate) {
            lastCodeRef.current = code.data;
            lastCodeTimeRef.current = now;
            onResult(code.data);
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    };

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cameraActive]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
          <CameraOff className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      {!cameraActive && !error && (
        <button
          onClick={() => setCameraActive(true)}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          Enable Camera Scanner
        </button>
      )}
      {cameraActive && (
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-3/5 h-3/5 border-2 border-violet-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/70 text-[10px] text-white/70">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            Scanning...
          </div>
          <button
            onClick={stopCamera}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
          >
            <CameraOff className="w-3 h-3" />
            Stop
          </button>
        </div>
      )}
    </div>
  );
};
