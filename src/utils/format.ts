import { formatDistanceToNow, format, parseISO } from 'date-fns';

export function formatRelativeTime(isoDate: string): string {
  return formatDistanceToNow(parseISO(isoDate), { addSuffix: true });
}

export function formatDateTime(isoDate: string): string {
  return format(parseISO(isoDate), 'MMM d, yyyy HH:mm');
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}
