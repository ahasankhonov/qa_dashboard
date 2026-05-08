'use client';

import { useState, useCallback } from 'react';
import { Terminal, Image as ImageIcon, Film, Archive, ExternalLink } from 'lucide-react';
import type { NormalizedTestCase, NormalizedAttachment } from '@/types/playwright';
import { ScreenshotThumb, ScreenshotModal } from './ScreenshotModal';

interface FailureDetailsProps {
  test: NormalizedTestCase;
  runId: number;
}

function AttachmentRow({
  attachment,
  runId,
  onScreenshotClick,
}: {
  attachment: NormalizedAttachment;
  runId: number;
  onScreenshotClick: (src: string) => void;
}) {
  const isImage = attachment.contentType.startsWith('image/');
  const isVideo = attachment.contentType.startsWith('video/');
  const isTrace = attachment.name === 'trace' || attachment.contentType === 'application/zip';

  if (isImage && attachment.base64) {
    return (
      <ScreenshotThumb
        base64={attachment.base64}
        contentType={attachment.contentType}
        label={attachment.name}
        onClick={onScreenshotClick}
      />
    );
  }

  const mediaUrl = attachment.zipPath
    ? `/api/runs/${runId}/media?file=${encodeURIComponent(attachment.zipPath)}`
    : null;

  const icon = isVideo ? (
    <Film className="w-4 h-4 text-purple-400" />
  ) : isTrace ? (
    <Archive className="w-4 h-4 text-blue-400" />
  ) : (
    <ImageIcon className="w-4 h-4 text-zinc-400" />
  );

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
      {icon}
      <span className="text-xs text-zinc-300 flex-1 truncate">{attachment.name}</span>
      {mediaUrl && (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Open
        </a>
      )}
    </div>
  );
}

export function FailureDetails({ test, runId }: FailureDetailsProps) {
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const closeModal = useCallback(() => setModalSrc(null), []);

  const screenshots = test.attachments.filter(
    (a) => a.contentType.startsWith('image/') && a.base64,
  );
  const otherAttachments = test.attachments.filter(
    (a) => !(a.contentType.startsWith('image/') && a.base64),
  );

  return (
    <div className="space-y-4 pt-1">
      {/* Error message */}
      {test.errorMessage && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border-b border-red-800/30">
            <Terminal className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-medium text-red-300">Error</span>
          </div>
          <pre className="text-xs text-red-300 font-mono p-3 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {test.errorMessage}
          </pre>
        </div>
      )}

      {/* Stack trace */}
      {test.errorStack && test.errorStack !== test.errorMessage && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors select-none list-none">
            <span className="w-3.5 h-3.5 flex items-center justify-center border border-zinc-700 rounded text-zinc-500 group-open:rotate-90 transition-transform">
              ›
            </span>
            Stack trace
          </summary>
          <pre className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
            {test.errorStack}
          </pre>
        </details>
      )}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            Screenshots ({screenshots.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {screenshots.map((att, i) => (
              <ScreenshotThumb
                key={`${att.name}-${i}`}
                base64={att.base64!}
                contentType={att.contentType}
                label={att.name}
                onClick={setModalSrc}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other attachments (traces, videos) */}
      {otherAttachments.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Attachments</p>
          <div className="space-y-1.5">
            {otherAttachments.map((att, i) => (
              <AttachmentRow
                key={`${att.name}-${i}`}
                attachment={att}
                runId={runId}
                onScreenshotClick={setModalSrc}
              />
            ))}
          </div>
        </div>
      )}

      <ScreenshotModal
        src={modalSrc}
        alt="Test failure screenshot"
        onClose={closeModal}
      />
    </div>
  );
}
