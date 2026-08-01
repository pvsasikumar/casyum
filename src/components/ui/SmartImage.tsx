import React, { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SmartImageProps {
  src?: string;
  alt?: string;
  fallback?: string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  objectFit?: 'cover' | 'contain';
  loading?: 'lazy' | 'eager';
}

/**
 * Image that shows a loading skeleton while fetching, and automatically swaps
 * to a fallback (or a neutral placeholder) when the URL fails to load.
 * Never leaves a broken image or an empty area.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt = '',
  fallback,
  placeholder,
  className = '',
  wrapperClassName = '',
  objectFit = 'cover',
  loading = 'lazy',
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [srcIndex, setSrcIndex] = useState(0);

  // Candidate sources: primary first, then the fallback (if different).
  const sources = useMemo(() => {
    const list: string[] = [];
    if (src && src.trim()) list.push(src.trim());
    if (fallback && fallback.trim() && fallback.trim() !== src?.trim()) list.push(fallback.trim());
    return list;
  }, [src, fallback]);

  useEffect(() => {
    setStatus('loading');
    setSrcIndex(0);
  }, [sources]);

  const currentSrc = sources[srcIndex];

  if (!currentSrc) {
    return (
      <div className={`flex items-center justify-center bg-white/[0.04] ${wrapperClassName || className || ''}`}>
        <div className="flex flex-col items-center gap-2 text-white/30">
          <ImageOff className="w-6 h-6" />
          {placeholder && <span className="text-[10px] font-bold uppercase tracking-widest">{placeholder}</span>}
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={`relative overflow-hidden bg-white/[0.04] ${wrapperClassName} ${className}`}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.05] to-white/[0.02]" />
        <img
          key={`${currentSrc}-${srcIndex}`}
          src={currentSrc}
          alt={alt}
          loading={loading}
          className="absolute inset-0 w-full h-full opacity-0"
          onLoad={() => setStatus('loaded')}
          onError={() => {
            if (srcIndex < sources.length - 1) {
              setSrcIndex((i) => i + 1);
            } else {
              setStatus('error');
            }
            if (src) {
              console.warn(`[CASYUM] Failed to load image: ${src}`);
            }
          }}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`flex items-center justify-center bg-white/[0.04] ${wrapperClassName || className || ''}`}>
        <div className="flex flex-col items-center gap-2 text-white/30">
          <ImageOff className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">{placeholder || 'Image unavailable'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <img src={currentSrc} alt={alt} loading={loading} className={`${objectFit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`} />
    </div>
  );
};

export default SmartImage;
