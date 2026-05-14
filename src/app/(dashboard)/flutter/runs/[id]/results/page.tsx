'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, MinusCircle, RefreshCw,
  ChevronDown, ChevronRight, Clock, FlaskConical,
} from 'lucide-react';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { cn } from '@/lib/cn';
import type { FlutterTestResults, FlutterTestCase } from '@/app/api/flutter/runs/[id]/results/route';

interface PageProps {
  params: Promise<{ id: string }>;
}

type StatusFilter = 'all' | 'passed' | 'failed' | 'skipped';

function StatusIcon({ status }: { status: FlutterTestCase['status'] }) {
  if (status === 'passed') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
  return <MinusCircle className="w-4 h-4 text-zinc-500" />;
}

function TestRow({ test }: { test: FlutterTestCase }) {
  const [expanded, setExpanded] = useState(false);
  const hasError = Boolean(test.errorMessage || test.stackTrace);

  return (
    <div className={cn(
      'border-b border-zinc-800/60 last:border-0',
      test.status === 'failed' && 'bg-red-500/5',
    )}>
      <button
        onClick={() => hasError && setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
          hasError ? 'hover:bg-zinc-800/40 cursor-pointer' : 'cursor-default',
        )}
      >
        {hasError ? (
          expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0" />
        )}
        <StatusIcon status={test.status} />
        <span className="flex-1 text-sm text-zinc-200 font-mono truncate">{test.name}</span>
        {test.duration > 0 && (
          <span className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {test.duration < 1000
              ? `${test.duration}ms`
              : `${(test.duration / 1000).toFixed(1)}s`}
          </span>
        )}
      </button>

      {expanded && hasError && (
        <div className="px-4 pb-4 ml-10 space-y-2">
          {test.errorMessage && (
            <pre className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {test.errorMessage}
            </pre>
          )}
          {test.stackTrace && (
            <pre className="text-xs text-zinc-500 bg-zinc-800/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {test.stackTrace}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function FlutterResultsPage({ params }: PageProps) {
  const { id } = use(params);
  const runId = Number(id);

  const [results, setResults] = useState<FlutterTestResults | null>(null);
  const [state, setState] = useState<'loading' | 'in_progress' | 'no_artifact' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/flutter/runs/${runId}/results`);
      if (res.status === 202) { setState('in_progress'); return; }
      if (res.status === 404) { setState('no_artifact'); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as FlutterTestResults;
      setResults(data);
      setState('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }, [runId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // Auto-refresh when in progress — setTimeout avoids overlapping fetches
  useEffect(() => {
    if (state !== 'in_progress') return;
    const t = setTimeout(fetchResults, 8_000);
    return () => clearTimeout(t);
  }, [state, fetchResults]);

  const filtered = results?.tests.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/flutter/runs/${runId}`}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Run Details
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-sm text-zinc-400">Test Results</span>
      </div>

      {/* Loading */}
      {state === 'loading' && (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading test results…
        </div>
      )}

      {/* In progress */}
      {state === 'in_progress' && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
          <div>
            <p className="text-sm font-medium text-blue-300">Run in progress</p>
            <p className="text-xs text-zinc-500 mt-0.5">Results will appear when the workflow completes.</p>
          </div>
        </div>
      )}

      {/* No artifact */}
      {state === 'no_artifact' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <FlaskConical className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-400">No test artifact found</p>
          <p className="text-xs text-zinc-600 mt-1">
            This run did not upload a ci-diagnostics artifact with test-results.json.
          </p>
        </div>
      )}

      {/* Error */}
      {state === 'error' && errorMsg && (
        <ErrorAlert message={errorMsg} onRetry={fetchResults} />
      )}

      {/* Results */}
      {state === 'ready' && results && (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: results.total, color: 'text-zinc-300' },
              { label: 'Passed', value: results.passed, color: 'text-emerald-400' },
              { label: 'Failed', value: results.failed, color: 'text-red-400' },
              { label: 'Skipped', value: results.skipped, color: 'text-zinc-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className={cn('text-2xl font-bold', color)}>{value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Overall status */}
          <div className={cn(
            'flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium',
            results.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300',
          )}>
            {results.success
              ? <CheckCircle2 className="w-5 h-5" />
              : <XCircle className="w-5 h-5" />}
            {results.success
              ? `All ${results.total} tests passed`
              : `${results.failed} test${results.failed !== 1 ? 's' : ''} failed out of ${results.total}`}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search tests…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
              {(['all', 'passed', 'failed', 'skipped'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize',
                    statusFilter === f
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Test list */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Test Cases</span>
              <span className="text-xs text-zinc-600">{filtered.length} shown</span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-zinc-600">
                No tests match your filter.
              </div>
            ) : (
              filtered.map((test) => <TestRow key={test.id} test={test} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
