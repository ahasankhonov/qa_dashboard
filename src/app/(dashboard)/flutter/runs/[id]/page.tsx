'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ExternalLink, FlaskConical, Clock, GitBranch, Hash, RefreshCw,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { formatRelativeTime, formatDuration, computeDuration } from '@/utils/format';
import type { WorkflowRun } from '@/types/github';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FlutterRunDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const runId = Number(id);

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRun = useCallback(async () => {
    if (isNaN(runId)) { setError('Invalid run ID'); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/flutter/runs/${runId}`);
      if (!res.ok) throw new Error(`Failed to fetch run: ${res.statusText}`);
      setRun(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  // Poll while running
  useEffect(() => {
    if (!run || run.status === 'completed') return;
    const t = setInterval(fetchRun, 5_000);
    return () => clearInterval(t);
  }, [run, fetchRun]);

  const duration = run ? computeDuration(run.run_started_at, run.updated_at) : 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>
        {run && (
          <>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-400">{run.name} #{run.run_number}</span>
          </>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchRun} />}

      {isLoading && !run && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading run details…
        </div>
      )}

      {run && (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">{run.name}</h1>
                <p className="text-sm text-zinc-500 mt-0.5">Run #{run.run_number}</p>
              </div>
              <StatusBadge status={run.status} conclusion={run.conclusion} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <GitBranch className="w-4 h-4 text-zinc-600" />
                <span className="font-mono text-zinc-300">{run.head_branch}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Clock className="w-4 h-4 text-zinc-600" />
                <span>{run.status === 'completed' ? formatDuration(duration) : 'Running…'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Hash className="w-4 h-4 text-zinc-600" />
                <span className="font-mono text-xs">{run.head_sha.slice(0, 7)}</span>
              </div>
              <div className="text-zinc-500 text-xs">
                {formatRelativeTime(run.created_at)}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-zinc-800">
              {run.status === 'completed' && (
                <Link
                  href={`/flutter/runs/${runId}/results`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-colors"
                >
                  <FlaskConical className="w-4 h-4" />
                  View Test Results
                </Link>
              )}
              <a
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>

          {/* Not-completed hint */}
          {run.status !== 'completed' && (
            <div className="flex items-center gap-2 text-sm text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded-lg px-4 py-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Run is in progress — polling for updates…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
