'use client';

import Link from 'next/link';
import { ExternalLink, ArrowRight, FlaskConical } from 'lucide-react';
import type { WorkflowRun } from '@/types/github';
import { StatusBadge } from '@/components/ui';
import { formatRelativeTime, formatDuration, computeDuration } from '@/utils/format';
import { TableRowSkeleton } from '@/components/ui/Skeleton';

interface WorkflowTableProps {
  runs: WorkflowRun[];
  isLoading?: boolean;
}

export function WorkflowTable({ runs, isLoading }: WorkflowTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Run
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Branch
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Duration
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Triggered
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
          ) : runs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">
                No workflow runs found
              </td>
            </tr>
          ) : (
            runs.map((run) => {
              const duration = computeDuration(run.run_started_at, run.updated_at);
              return (
                <tr key={run.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/runs/${run.id}`}
                        className="text-zinc-200 font-medium hover:text-indigo-400 transition-colors"
                      >
                        {run.name || `Run #${run.run_number}`}
                      </Link>
                      <p className="text-xs text-zinc-500">#{run.run_number}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} conclusion={run.conclusion} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400 font-mono bg-zinc-800 px-2 py-0.5 rounded">
                      {run.head_branch}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">
                    {run.status === 'completed'
                      ? formatDuration(duration)
                      : run.status === 'in_progress'
                      ? (
                        <span className="text-blue-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                          Running
                        </span>
                      )
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {formatRelativeTime(run.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {run.status === 'completed' && (
                        <Link
                          href={`/runs/${run.id}/results`}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-zinc-500 hover:text-indigo-400 transition-colors"
                          title="View test results"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <Link
                        href={`/runs/${run.id}`}
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="View details"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <a
                        href={run.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Open in GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
