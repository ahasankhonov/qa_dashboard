'use client';

import Link from 'next/link';
import { ExternalLink, Clock, GitBranch, Package, ChevronRight, FlaskConical } from 'lucide-react';
import type { WorkflowRun } from '@/types/github';
import { StatusBadge } from '@/components/ui';
import { formatRelativeTime, formatDuration, formatDateTime, computeDuration } from '@/utils/format';

interface RunCardProps {
  run: WorkflowRun;
  artifactsCount?: number;
  basePath?: string;
}

export function RunCard({ run, artifactsCount, basePath = '/runs' }: RunCardProps) {
  const duration = computeDuration(run.run_started_at, run.updated_at);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`${basePath}/${run.id}`}
            className="text-sm font-semibold text-zinc-100 hover:text-indigo-400 transition-colors truncate block"
          >
            {run.name || `Workflow Run #${run.run_number}`}
          </Link>
          <p className="text-xs text-zinc-500 mt-0.5">
            Run #{run.run_number} · {formatDateTime(run.created_at)}
          </p>
        </div>
        <StatusBadge status={run.status} conclusion={run.conclusion} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <GitBranch className="w-3.5 h-3.5" />
          <span className="font-mono text-zinc-400 truncate">{run.head_branch}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{run.status === 'completed' ? formatDuration(duration) : 'Running…'}</span>
        </div>
        {artifactsCount !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Package className="w-3.5 h-3.5" />
            <span>
              {artifactsCount} artifact{artifactsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>{formatRelativeTime(run.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
        {run.status === 'completed' && (
          <Link
            href={`${basePath}/${run.id}/results`}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Test Results
          </Link>
        )}
        <Link
          href={`${basePath}/${run.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          Details
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <a
          href={run.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          GitHub
        </a>
      </div>
    </div>
  );
}
