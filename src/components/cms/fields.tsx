import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, AlertCircle, Trash2 } from 'lucide-react';
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
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  aspect?: string;
  canEdit: boolean;
  /** Optional image alt text editor rendered under the preview. */
  imageAlt?: string;
  onImageAltChange?: (alt: string) => void;
}

/**
 * Image field backed by a plain, publicly accessible image URL (no Firebase
 * Storage). Shows an immediate live preview and a friendly error when the URL
 * cannot be loaded. Removing the image only clears the stored URL.
 */
export const CmsImageField: React.FC<ImageFieldProps> = ({
  value,
  onChange,
  label,
  hint,
  aspect = 'aspect-video',
  canEdit,
  imageAlt,
  onImageAltChange,
}) => {
  const [failed, setFailed] = useState(false);
  const trimmed = (value || '').trim();

  // Reset the error state whenever the URL changes so a fixed URL previews again.
  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  const handleRemove = useCallback(() => {
    // Only clears the stored image URL — the externally hosted file stays untouched.
    onChange('');
    setFailed(false);
  }, [onChange]);

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
      {/* Live preview */}
      {trimmed ? (
        <div className={`relative overflow-hidden rounded-xl bg-white/5 border border-white/10 ${aspect}`}>
          {failed ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-white/[0.03] text-white/30 px-4 text-center">
              <AlertCircle className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Unable to load this image. Please check the URL.
              </span>
            </div>
          ) : (
            <img
              key={trimmed}
              src={trimmed}
              alt={imageAlt || label || ''}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={() => setFailed(true)}
            />
          )}
        </div>
      ) : (
        <div
          className={`${aspect} w-full rounded-xl border border-dashed border-white/15 bg-white/[0.03] flex flex-col items-center justify-center gap-2 text-white/40`}
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Paste an image URL below</span>
          <span className="text-[9px] text-white/25">The preview appears automatically</span>
        </div>
      )}

      {/* URL input */}
      <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label || 'Image URL'}</label>
      <CmsInput
        value={value}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://example.com/image.jpg"
        spellCheck={false}
      />

      <div className="flex items-center gap-2 flex-wrap">
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            Delete Image
          </button>
        )}
      </div>

      {value && imageAlt !== undefined && onImageAltChange && (
        <CmsInput
          value={imageAlt}
          onChange={(e) => onImageAltChange(e.target.value)}
          placeholder="Image alt text (accessibility)"
          className="p-2 text-[11px]"
        />
      )}

      {hint && <span className="text-[10px] text-white/30">{hint}</span>}
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
