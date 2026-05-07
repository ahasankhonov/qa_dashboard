import type { WorkflowRunConclusion, WorkflowRunStatus } from '@/types/github';

export type StatusVariant = 'success' | 'failure' | 'running' | 'pending' | 'cancelled' | 'neutral';

export function getStatusVariant(
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
): StatusVariant {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') return 'running';
  if (status === 'completed') {
    if (conclusion === 'success') return 'success';
    if (conclusion === 'failure' || conclusion === 'timed_out') return 'failure';
    if (conclusion === 'cancelled') return 'cancelled';
    return 'neutral';
  }
  return 'pending';
}

export function getStatusLabel(
  status: WorkflowRunStatus,
  conclusion: WorkflowRunConclusion,
): string {
  if (status === 'in_progress') return 'Running';
  if (status === 'queued') return 'Queued';
  if (status === 'waiting') return 'Waiting';
  if (status === 'completed') {
    if (conclusion === 'success') return 'Passed';
    if (conclusion === 'failure') return 'Failed';
    if (conclusion === 'cancelled') return 'Cancelled';
    if (conclusion === 'timed_out') return 'Timed Out';
    if (conclusion === 'skipped') return 'Skipped';
    return 'Completed';
  }
  return 'Pending';
}

export const STATUS_COLORS: Record<StatusVariant, string> = {
  success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  failure: 'text-red-400 bg-red-400/10 border-red-400/20',
  running: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  cancelled: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
  neutral: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};

export const STATUS_DOT_COLORS: Record<StatusVariant, string> = {
  success: 'bg-emerald-400',
  failure: 'bg-red-400',
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-yellow-400',
  cancelled: 'bg-zinc-400',
  neutral: 'bg-zinc-400',
};
