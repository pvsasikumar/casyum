import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  ImagePlus,
  X,
  Loader2,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ImageOff,
} from 'lucide-react';
import {
  uploadEventImage,
  uploadImageToStorage,
  deleteFileFromStorage,
  getStoragePathFromUrl,
  type UploadResult,
} from '../../firebase/storage';
import { SmartImage } from '../ui/SmartImage';

const inputBase =
  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 text-xs transition-colors';

export const CmsField: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</label>
    {children}
    {hint && <span className="text-[10px] text-white/30">{hint}</span>}
  </div>
);

export const CmsInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input {...props} className={`${inputBase} ${props.className || ''}`} />
);

export const CmsTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea {...props} className={`${inputBase} resize-none ${props.className || ''}`} />
);

export const CmsSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select {...props} className={`${inputBase} appearance-none ${props.className || ''}`}>
    {children}
  </select>
);

export const CmsReadOnlyText: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`text-sm text-white/80 leading-relaxed ${className}`}>{children || '—'}</div>
);

interface ImageFieldProps {
  value: string;
  onChange: (url: string, meta?: { path?: string }) => void;
  /** Legacy storage prefix (e.g. 'profiles', 'cms/{eventId}/gallery'). */
  storagePrefix?: string;
  /** Event ID for structured uploads: events/{eventId}/{storageFolder}/... */
  eventId?: string;
  /** Structured folder: hero | logo | about | gallery | sponsors | images | ... */
  storageFolder?: string;
  label?: string;
  hint?: string;
  aspect?: string;
  canEdit: boolean;
  /** Current storage path of the value, so old files can be cleaned up. */
  imagePath?: string;
  /** Optional image alt text editor rendered under the preview. */
  imageAlt?: string;
  onImageAltChange?: (alt: string) => void;
  /** Show a "paste URL" input in addition to upload. */
  allowUrl?: boolean;
}

type UploadPhase = 'idle' | 'uploading' | 'complete' | 'error';

export const CmsImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  storagePrefix,
  eventId,
  storageFolder,
  label,
  hint,
  aspect = 'aspect-video',
  canEdit,
  imagePath,
  imageAlt,
  onImageAltChange,
  allowUrl = true,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  // When the bound value changes (e.g. the CMS finishes loading a stored or
  // local event image), clear any stale upload state so the field never stays
  // stuck on "Uploading… 0%" for an image that is already available.
  useEffect(() => {
    setPhase('idle');
    setProgress(0);
    setError('');
  }, [value]);

  const currentPath = imagePath || getStoragePathFromUrl(value) || '';

  const runUpload = useCallback(
    async (file: File) => {
      setError('');
      setPhase('uploading');
      setProgress(0);
      lastFileRef.current = file;
      try {
        const result: UploadResult = eventId && storageFolder
          ? await uploadEventImage(eventId, storageFolder, file, {
              onProgress: setProgress,
            })
          : await uploadImageToStorage(storagePrefix || 'uploads', file, {
              onProgress: setProgress,
            }).then((url) => ({
              url,
              path: getStoragePathFromUrl(url) || '',
              name: file.name,
              contentType: file.type || 'image/jpeg',
              size: file.size,
              uploadedAt: new Date().toISOString(),
            }));

        // Clean up the previous file only after the new one is safe.
        if (currentPath && result.path && currentPath !== result.path) {
          void deleteFileFromStorage(currentPath);
        }
        onChange(result.url, { path: result.path });
        setProgress(100);
        setPhase('complete');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed.';
        setError(message);
        setPhase('error');
        console.error('[CASYUM] Image upload failed:', err);
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [eventId, storageFolder, storagePrefix, currentPath, onChange]
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      void runUpload(file);
    },
    [runUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void runUpload(file);
    },
    [runUpload]
  );

  const handleRemove = useCallback(() => {
    if (currentPath) {
      void deleteFileFromStorage(currentPath);
    }
    onChange('', { path: '' });
    setPhase('idle');
    setError('');
    setProgress(0);
  }, [currentPath, onChange]);

  const handleRetry = useCallback(() => {
    if (lastFileRef.current) void runUpload(lastFileRef.current);
  }, [runUpload]);

  if (!canEdit) {
    if (!value) return null;
    return (
      <div className={`${aspect} w-full overflow-hidden rounded-xl bg-white/5 border border-white/10`}>
        <SmartImage src={value} alt={label || ''} className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative group overflow-hidden rounded-xl bg-white/5 border border-white/10">
          <SmartImage
            src={value}
            alt={imageAlt || label || ''}
            wrapperClassName={`${aspect} w-full`}
            className="w-full h-full"
            placeholder="Preview"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg bg-rose-500/30 text-rose-300 hover:bg-rose-500/50 cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`${aspect} w-full rounded-xl border border-dashed bg-white/[0.03] flex flex-col items-center justify-center gap-2 text-white/40 transition-colors cursor-pointer ${
            dragOver ? 'border-violet-500/70 text-violet-300 bg-violet-500/5' : 'border-white/15 hover:text-white/70 hover:border-violet-500/40'
          }`}
        >
          {phase === 'uploading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                Uploading… {progress}%
              </span>
              <div className="w-32 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <ImagePlus className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Drop image here or click</span>
              <span className="text-[9px] text-white/25">JPG, PNG, WEBP · max 10 MB</span>
            </>
          )}
        </div>
      )}

      {value && imageAlt !== undefined && onImageAltChange && (
        <CmsInput
          value={imageAlt}
          onChange={(e) => onImageAltChange(e.target.value)}
          placeholder="Image alt text (accessibility)"
          className="p-2 text-[11px]"
        />
      )}

      {phase === 'uploading' && value && (
        <div className="flex items-center gap-2 text-[11px] text-violet-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Uploading new image… {progress}%</span>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Upload complete.
        </p>
      )}

      {phase === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="break-words">{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 text-[10px] font-bold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={phase === 'uploading'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-[10px] font-bold cursor-pointer disabled:opacity-50"
        >
          {phase === 'uploading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {phase === 'uploading' ? 'Uploading…' : value ? 'Replace Image' : 'Upload Image'}
        </button>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Remove
          </button>
        )}
        {allowUrl && (
          <button
            type="button"
            onClick={() => setShowUrl((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white hover:border-white/25 text-[10px] font-bold cursor-pointer"
          >
            <Link2 className="w-3 h-3" />
            URL
          </button>
        )}
      </div>

      {showUrl && (
        <div className="flex items-center gap-2">
          <CmsInput
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste image URL..."
          />
          {value && !currentPath && (
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 cursor-pointer"
              title="Clear URL"
            >
              <ImageOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {hint && <span className="text-[10px] text-white/30">{hint}</span>}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, children }) => (
  <section className="rounded-3xl bg-white/[0.03] backdrop-blur-md border border-white/10 p-5 sm:p-6 flex flex-col gap-5 hover:border-white/15 transition-colors">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-violet-500/15 text-violet-300 border border-violet-500/20">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <h3 className="text-sm font-extrabold font-display text-white">{title}</h3>
        {subtitle && <span className="text-[10px] text-white/40">{subtitle}</span>}
      </div>
    </div>
    {children}
  </section>
);

export const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-6 text-center text-[11px] text-white/30 rounded-xl bg-white/[0.02] border border-dashed border-white/10">
    {text}
  </div>
);
