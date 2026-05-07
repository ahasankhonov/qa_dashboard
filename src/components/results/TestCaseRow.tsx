'use client';

import { useState } from 'react';
import { ChevronRight, Clock, Repeat2, Monitor } from 'lucide-react';
import type { NormalizedTestCase } from '@/types/playwright';
import { FailureDetails } from './FailureDetails';
import { formatDuration } from '@/utils/format';
import { cn } from '@/lib/cn';

type TestStatus = NormalizedTestCase['status'];

const STATUS_STYLES: Record<TestStatus, { bar: string; badge: string; label: string }> = {
  passed: {
    bar: 'bg-emerald-500',
    badge: 'text-emerald-400 bg-emerald-400/10',
    label: 'Passed',
  },
  failed: {
    bar: 'bg-red-500',
    badge: 'text-red-400 bg-red-400/10',
    label: 'Failed',
  },
  timedout: {
    bar: 'bg-red-600',
    badge: 'text-red-400 bg-red-400/10',
    label: 'Timed Out',
  },
  skipped: {
    bar: 'bg-zinc-600',
    badge: 'text-zinc-400 bg-zinc-400/10',
    label: 'Skipped',
  },
  flaky: {
    bar: 'bg-yellow-500',
    badge: 'text-yellow-400 bg-yellow-400/10',
    label: 'Flaky',
  },
};

interface TestCaseRowProps {
  test: NormalizedTestCase;
  runId: number;
}

export function TestCaseRow({ test, runId }: TestCaseRowProps) {
  const [expanded, setExpanded] = useState(
    // Auto-expand failed tests so users see errors immediately
    test.status === 'failed' || test.status === 'timedout',
  );

  const style = STATUS_STYLES[test.status];
  const hasDetails =
    !!test.errorMessage ||
    !!test.errorStack ||
    test.attachments.length > 0;

  const screenshots = test.attachments.filter(
    (a) => a.contentType.startsWith('image/') && a.base64,
  );

  return (
    <div
      className={cn(
        'border border-zinc-800 rounded-xl overflow-hidden transition-all',
        expanded && hasDetails ? 'bg-zinc-900' : 'bg-zinc-900/60',
      )}
    >
      {/* Row header */}
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          hasDetails ? 'hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default',
        )}
      >
        {/* Status bar */}
        <div className={cn('w-1 h-8 rounded-full flex-shrink-0', style.bar)} />

        {/* Chevron */}
        <span
          className={cn(
            'text-zinc-600 transition-transform flex-shrink-0',
            expanded ? 'rotate-90' : '',
            !hasDetails && 'opacity-0',
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </span>

        {/* Test name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-200 font-medium truncate">{test.title}</p>
          {test.suitePath.length > 0 && (
            <p className="text-xs text-zinc-500 truncate mt-0.5">
              {test.suitePath.join(' › ')}
            </p>
          )}
        </div>

        {/* Metadata chips */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status badge */}
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              style.badge,
            )}
          >
            {style.label}
          </span>

          {/* Browser */}
          {test.browser && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
              <Monitor className="w-3 h-3" />
              {test.browser}
            </span>
          )}

          {/* Retries */}
          {test.retries > 0 && (
            <span className="flex items-center gap-1 text-xs text-yellow-500">
              <Repeat2 className="w-3 h-3" />
              {test.retries}×
            </span>
          )}

          {/* Duration */}
          <span className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 tabular-nums">
            <Clock className="w-3 h-3" />
            {formatDuration(test.duration)}
          </span>

          {/* Screenshot count pill */}
          {screenshots.length > 0 && (
            <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">
              📷 {screenshots.length}
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 pt-0 border-t border-zinc-800">
          <FailureDetails test={test} runId={runId} />
        </div>
      )}
    </div>
  );
}
