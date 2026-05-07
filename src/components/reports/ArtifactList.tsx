import { Package, Download, FileImage, FileText, Film } from 'lucide-react';
import type { Artifact } from '@/types/github';
import { formatFileSize, formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/cn';

function getArtifactIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('screenshot') || lower.includes('image') || lower.includes('png') || lower.includes('jpg')) {
    return <FileImage className="w-4 h-4 text-blue-400" />;
  }
  if (lower.includes('video') || lower.includes('trace') || lower.includes('webm')) {
    return <Film className="w-4 h-4 text-purple-400" />;
  }
  if (lower.includes('report') || lower.includes('html') || lower.includes('json')) {
    return <FileText className="w-4 h-4 text-green-400" />;
  }
  return <Package className="w-4 h-4 text-zinc-400" />;
}

interface ArtifactListProps {
  artifacts: Artifact[];
  className?: string;
}

export function ArtifactList({ artifacts, className }: ArtifactListProps) {
  if (artifacts.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4 text-center">No artifacts available</p>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors group"
        >
          <div className="flex-shrink-0">{getArtifactIcon(artifact.name)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 font-medium truncate">{artifact.name}</p>
            <p className="text-xs text-zinc-500">
              {formatFileSize(artifact.size_in_bytes)} · Expires{' '}
              {formatRelativeTime(artifact.expires_at)}
            </p>
          </div>
          {!artifact.expired && (
            <a
              href={artifact.archive_download_url}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100"
              title="Download artifact (requires GitHub auth)"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          {artifact.expired && (
            <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded">
              Expired
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
