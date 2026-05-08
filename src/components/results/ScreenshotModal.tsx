'use client';

import { useEffect, useCallback } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ScreenshotModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ScreenshotModal({ src, alt = 'Screenshot', onClose }: ScreenshotModalProps) {
  useEffect(() => {
    if (!src) return;

    // Lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handler);
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <p className="text-sm text-zinc-400 font-medium truncate pr-4">{alt}</p>
          <button
            onClick={onClose}
            aria-label="Close screenshot"
            className="flex-shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Image */}
        <div className="overflow-auto max-h-[calc(90vh-3rem)] flex items-center justify-center bg-zinc-950 p-2">
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto rounded object-contain"
          />
        </div>
      </div>
    </div>
  );
}

interface ScreenshotThumbProps {
  base64: string;
  contentType?: string;
  label?: string;
  onClick: (src: string) => void;
}

export function ScreenshotThumb({
  base64,
  contentType = 'image/png',
  label,
  onClick,
}: ScreenshotThumbProps) {
  const src = `data:${contentType};base64,${base64}`;

  const handleClick = useCallback(() => onClick(src), [onClick, src]);

  return (
    <button
      onClick={handleClick}
      aria-label={label ? `View screenshot: ${label}` : 'View screenshot'}
      className={cn(
        'relative group rounded-lg overflow-hidden border border-zinc-700 hover:border-indigo-500 transition-all',
        'bg-zinc-800 flex-shrink-0',
      )}
      style={{ width: 160, height: 100 }}
      title={label ?? 'View screenshot'}
    >
      <img src={src} alt={label ?? 'screenshot'} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}
