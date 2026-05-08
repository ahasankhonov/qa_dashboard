'use client';

import { useEffect, useState } from 'react';
import type { WorkflowRunStatus, WorkflowRunConclusion } from '@/types/github';
import { cn } from '@/lib/cn';

interface PassRateBadgeProps {
  runId: number;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  size?: 'sm' | 'md';
  className?: string;
}

type LoadState = 'ready' | 'loading' | 'none';

function getColor(rate: number): string {
  if (rate === 100) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (rate >= 90)   return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  return                   'text-red-400   bg-red-400/10   border-red-400/20';
}

export function PassRateBadge({
  runId,
  status,
  conclusion,
  size = 'md',
  className,
}: PassRateBadgeProps) {
  const [passRate, setPassRate] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    // Runs still in flight — no data yet
    if (status !== 'completed') { setLoadState('none'); return; }

    // Successful run is always 100 % — no API call needed
    if (conclusion === 'success') { setPassRate(100); setLoadState('ready'); return; }

    // Cancelled / skipped — no meaningful percentage
    if (conclusion === 'cancelled' || conclusion === 'skipped') {
      setLoadState('none');
      return;
    }

    // Cache-only check — never triggers a ZIP download from the list view
    const controller = new AbortController();
    fetch(`/api/runs/${runId}/pass-rate`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 204) { setLoadState('none'); return; }
        if (!res.ok) { setLoadState('none'); return; }
        const data = await res.json();
        if (typeof data.passRate === 'number') {
          setPassRate(data.passRate);
          setLoadState('ready');
        } else {
          setLoadState('none');
        }
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setLoadState('none');
      });

    return () => controller.abort();
  }, [runId, status, conclusion]);

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  // ── Running ──────────────────────────────────────────────────────────────
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        'text-blue-400 bg-blue-400/10 border-blue-400/20',
        sizeClass, className,
      )}>
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        Running
      </span>
    );
  }

  // ── Has pass rate ─────────────────────────────────────────────────────────
  if (loadState === 'ready' && passRate !== null) {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold tabular-nums',
        getColor(passRate),
        sizeClass, className,
      )}>
        {passRate}%
      </span>
    );
  }

  // ── Loading spinner (brief moment before cache-check resolves) ────────────
  if (loadState === 'loading') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        'text-zinc-500 bg-zinc-800 border-zinc-700 animate-pulse',
        sizeClass, className,
      )}>
        <span className="w-8 h-2 rounded bg-zinc-700" />
      </span>
    );
  }

  // ── Fallback: no playwright data found for this run ──────────────────────
  const neutralStyle = conclusion === 'cancelled'
    ? 'text-zinc-400 bg-zinc-800 border-zinc-700'
    : 'text-zinc-500 bg-zinc-800/60 border-zinc-700/60';
  const neutralLabel = conclusion === 'cancelled' ? 'Cancelled' : '—';

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      neutralStyle,
      sizeClass, className,
    )}>
      {neutralLabel}
    </span>
  );
}
