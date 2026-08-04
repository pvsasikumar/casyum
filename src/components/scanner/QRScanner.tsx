import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  CheckCheck,
} from 'lucide-react';

interface QRScannerProps {
  onResult: (data: string) => void;
  autoStart?: boolean;
  /** When true, scan results are suppressed (e.g. while a verification request
   * is still being processed) so the same QR cannot be scanned repeatedly. */
  processing?: boolean;
}

/** Decode rate (frames per second) handed to the ZXing engine. */
const SCAN_FPS = 10;
/** Square scan box size in pixels handed to the ZXing engine. */
const SCAN_BOX_SIZE = 300;
/** Ignore re-decodes of the same code within this window. */
const DUPLICATE_WINDOW_MS = 3000;

interface ScannerCamera {
  id: string;
  label: string;
}

/**
 * Professional camera-based QR scanner used by the Registration Team and Event
 * Coordinators. Provides camera selection, front/rear switching, flashlight
 * (when supported) and fully automatic code detection — no manual capture.
 *
 * Detection is delegated to the `html5-qrcode` ZXing engine, which runs inside
 * a web worker instead of the old main-thread canvas + jsQR loop (far more
 * reliable and battery-friendly on mobile).
 *
 * The camera (and therefore the permission prompt) is only ever requested when
 * the user explicitly clicks a Start/Scan button — never on mount.
 */
export const QRScanner: React.FC<QRScannerProps> = ({ onResult, autoStart = false, processing = false }) => {
  // html5-qrcode resolves its container by id, so give every instance a unique
  // one (StrictMode-safe even when several scanners mount over a session).
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Html5Qrcode | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const lastCodeRef = useRef('');
  const lastCodeTimeRef = useRef(0);
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const activeDeviceIdRef = useRef('');
  const onResultRef = useRef(onResult);
  const startCameraRef = useRef<(deviceId?: string) => Promise<void>>(async () => {});

  const [cameras, setCameras] = useState<ScannerCamera[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchToggling, setTorchToggling] = useState(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    processingRef.current = processing;
    // Once the pending request finishes, allow the same QR to be scanned again
    // (used after a failed verification attempt).
    if (!processing) {
      lastCodeRef.current = '';
      lastCodeTimeRef.current = 0;
      // Restart scanning after the parent finished handling the decoded code.
      if (pausedRef.current) {
        pausedRef.current = false;
        if (mountedRef.current) setPaused(false);
        const instance = instanceRef.current;
        if (instance) {
          try {
            instance.resume();
          } catch {
            // Engine is gone (e.g. camera released) — restart from scratch.
            void startCameraRef.current(activeDeviceIdRef.current || undefined);
          }
        }
      }
    }
  }, [processing]);

  const getOrCreateInstance = useCallback((): Html5Qrcode | null => {
    if (instanceRef.current) return instanceRef.current;
    if (!containerRef.current) return null;
    const instance = new Html5Qrcode(containerId);
    instanceRef.current = instance;
    return instance;
  }, [containerId]);

  const refreshCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(
        devices.filter((d) => d.kind === 'videoinput').map((d) => ({ id: d.deviceId, label: d.label }))
      );
    } catch {
      // ignore — camera list is a convenience, not a blocker
    }
  }, []);

  const readActiveTrack = useCallback((): MediaStreamTrack | null => {
    const video = containerRef.current?.querySelector('video');
    if (video && video.srcObject instanceof MediaStream) {
      return video.srcObject.getVideoTracks()[0] || null;
    }
    return null;
  }, []);

  const readActiveDeviceId = useCallback(() => {
    const track = readActiveTrack();
    if (track) {
      const id = track.getSettings().deviceId || '';
      activeDeviceIdRef.current = id;
      setActiveDeviceId(id);
    }
  }, [readActiveTrack]);

  const refreshTorchSupport = useCallback(() => {
    const track = readActiveTrack();
    if (!track) {
      setTorchSupported(false);
      return;
    }
    try {
      const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(typeof caps.torch === 'boolean');
    } catch {
      setTorchSupported(false);
    }
  }, [readActiveTrack]);

  const handleDecoded = useCallback((decodedText: string) => {
    // Suppress decoding while a verification request is being processed so the
    // same QR cannot be re-submitted repeatedly.
    if (processingRef.current) return;
    const now = Date.now();
    const isDuplicate =
      decodedText === lastCodeRef.current && now - lastCodeTimeRef.current < DUPLICATE_WINDOW_MS;
    if (isDuplicate) return;
    lastCodeRef.current = decodedText;
    lastCodeTimeRef.current = now;

    // Pause the engine immediately so the same code cannot re-fire while the
    // parent processes the result. Scanning resumes automatically once the
    // `processing` prop flips back to false (or via the Resume button).
    pausedRef.current = true;
    if (mountedRef.current) setPaused(true);
    const instance = instanceRef.current;
    if (instance) {
      try {
        instance.pause();
      } catch {
        // engine may already be gone — nothing to pause
      }
    }

    onResultRef.current(decodedText);
  }, []);

  const resumeScanning = useCallback(async () => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    if (mountedRef.current) setPaused(false);
    const instance = instanceRef.current;
    if (!instance) return;
    try {
      instance.resume();
    } catch {
      // Engine is gone (e.g. camera released) — restart from scratch.
      await startCameraRef.current(activeDeviceIdRef.current || undefined);
    }
  }, []);

  const errorMessage = useCallback((err: any): string => {
    const name = err?.name || '';
    const message = String(err?.message || '').toLowerCase();
    if (name === 'NotAllowedError' || name === 'SecurityError' || message.includes('permission')) {
      return 'Camera permission required.';
    }
    if (name === 'NotFoundError' || message.includes('not found') || message.includes('no camera')) {
      return 'No camera found on this device.';
    }
    return 'Camera access is unavailable. Use manual search instead.';
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      const gen = ++generationRef.current;
      setStatus('starting');
      setError('');
      setTorchOn(false);
      setTorchSupported(false);

      // getMediaDeviceSupport is unavailable on insecure origins / non-supporting
      // browsers (e.g. WebView without camera permission grants).
      const mediaSupported =
        typeof navigator !== 'undefined' &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function';
      if (!mediaSupported) {
        setError('Camera scanning is not supported in this browser. Use manual search instead.');
        setStatus('error');
        return;
      }

      const instance = getOrCreateInstance();
      if (!instance) {
        setError('Camera access is unavailable. Use manual search instead.');
        setStatus('error');
        return;
      }

      try {
        if (instance.isScanning) {
          await instance.stop();
        }
        try {
          instance.clear();
        } catch {
          // container may already be clean
        }
        if (generationRef.current !== gen) return;

        const cameraConfig: string | MediaTrackConstraints = deviceId || { facingMode: 'environment' };
        await instance.start(
          cameraConfig,
          {
            fps: SCAN_FPS,
            qrbox: SCAN_BOX_SIZE,
            aspectRatio: 1,
          },
          (decodedText) => handleDecoded(decodedText),
          () => {
            // Per-frame decode misses are expected while scanning — ignore.
          }
        );

        if (generationRef.current !== gen) return;
        readActiveDeviceId();
        refreshTorchSupport();
        setStatus('active');
        // Device labels are only populated after permission is granted.
        void refreshCameras();
      } catch (err: any) {
        if (generationRef.current !== gen) return;
        setError(errorMessage(err));
        setStatus('error');
      }
    },
    [getOrCreateInstance, handleDecoded, readActiveDeviceId, refreshTorchSupport, refreshCameras, errorMessage]
  );

  // Keep a stable reference to startCamera so earlier callbacks (resume,
  // processing) can trigger a restart without circular declaration ordering.
  useEffect(() => {
    startCameraRef.current = startCamera;
  }, [startCamera]);

  // Keep the engine-rendered video filling the square frame (object-fit cover).
  useEffect(() => {
    if (status !== 'active') return;
    const video = containerRef.current?.querySelector('video');
    if (video) {
      video.style.objectFit = 'cover';
      video.style.width = '100%';
      video.style.height = '100%';
    }
  }, [status]);

  const stopCamera = useCallback(async () => {
    const gen = ++generationRef.current;
    const instance = instanceRef.current;
    if (!instance) return;
    pausedRef.current = false;
    try {
      await instance.stop();
    } catch {
      // not scanning
    }
    if (generationRef.current === gen) {
      setTorchOn(false);
      setTorchSupported(false);
      setPaused(false);
      setStatus('idle');
    }
  }, []);

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
      // Discard any in-flight start and release the camera + DOM created by
      // the engine. Runs on unmount and StrictMode's double-invoked effects.
      generationRef.current += 1;
      const instance = instanceRef.current;
      instanceRef.current = null;
      if (instance) {
        void instance
          .stop()
          .catch(() => undefined)
          .then(() => {
            try {
              instance.clear();
            } catch {
              // container may already be gone
            }
          });
      }
    };
  }, [autoStart, startCamera, refreshCameras]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex((c) => c.id === activeDeviceId);
    const next = cameras[(currentIndex + 1) % cameras.length];
    void startCamera(next.id);
  }, [cameras, activeDeviceId, startCamera]);

  const toggleTorch = useCallback(async () => {
    if (torchToggling) return;
    const instance = instanceRef.current;
    if (!instance || !instance.isScanning) return;
    setTorchToggling(true);
    try {
      await instance.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as MediaTrackConstraintSet],
      });
      setTorchOn((prev) => !prev);
    } catch {
      // flashlight not available on this track
    } finally {
      setTorchToggling(false);
    }
  }, [torchOn, torchToggling]);

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
              <option key={cam.id} value={cam.id} className="bg-zinc-900">
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
            disabled={torchToggling}
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
          onClick={() => (isActive ? void stopCamera() : void startCamera())}
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
        <div id={containerId} ref={containerRef} className="absolute inset-0" />

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

        {paused && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <CheckCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white/80">QR captured</p>
            <p className="text-[10px] text-white/50">Processing scan result...</p>
            <button
              onClick={() => void resumeScanning()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold cursor-pointer"
            >
              <RefreshCcw className="w-3 h-3" />
              Resume Scanning
            </button>
          </div>
        )}

        {isActive && !paused && (
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
