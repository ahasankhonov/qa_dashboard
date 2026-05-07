'use client';

import { useState, useEffect, useCallback, use, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, FlaskConical, Loader2, AlertCircle, Info } from 'lucide-react';
import { TestResultsHeader } from '@/components/results/TestResultsHeader';
import { ResultsFilter, type StatusFilter } from '@/components/results/ResultsFilter';
import { TestSuiteTree } from '@/components/results/TestSuiteTree';
import { Skeleton } from '@/components/ui/Skeleton';
import type { NormalizedReport } from '@/types/playwright';

interface PageProps {
  params: Promise<{ id: string }>;
}

type LoadState = 'loading' | 'in_progress' | 'no_artifact' | 'error' | 'ready';

export default function ResultsPage({ params }: PageProps) {
  const { id } = use(params);
  const runId = Number(id);

  const [report, setReport] = useState<NormalizedReport | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [artifactNames, setArtifactNames] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [slowLoad, setSlowLoad] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoadState('loading');
    setSlowLoad(false);
    try {
      const res = await fetch(`/api/runs/${runId}/playwright-results`);
      const data = await res.json();

      if (res.status === 202) {
        setLoadState('in_progress');
        return;
      }
      if (res.status === 404) {
        setArtifactNames(data.artifacts ?? []);
        setLoadState('no_artifact');
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Unknown error');
        setLoadState('error');
        return;
      }

      setReport(data as NormalizedReport);
      setLoadState('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setLoadState('error');
    }
  }, [runId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Auto-poll while run is in progress
  useEffect(() => {
    if (loadState !== 'in_progress') return;
    const t = setTimeout(fetchResults, 8000);
    return () => clearTimeout(t);
  }, [loadState, fetchResults]);

  // Show a hint after 2.5 s to explain the ZIP download delay
  useEffect(() => {
    if (loadState !== 'loading') return;
    const t = setTimeout(() => setSlowLoad(true), 2500);
    return () => clearTimeout(t);
  }, [loadState]);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredTests = useMemo(() => {
    if (!report) return [];
    return report.allTests.filter((t) => {
      const matchesStatus =
        statusFilter === 'all' ||
        t.status === statusFilter ||
        (statusFilter === 'failed' && t.status === 'timedout');
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.suitePath.join(' ').toLowerCase().includes(q) ||
        (t.errorMessage ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [report, search, statusFilter]);

  const isFiltered = !!(search || statusFilter !== 'all');

  const filterCounts = useMemo(() => {
    if (!report) return { all: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, timedout: 0 };
    const all = report.allTests;
    return {
      all: all.length,
      passed: all.filter((t) => t.status === 'passed').length,
      failed: all.filter((t) => t.status === 'failed' || t.status === 'timedout').length,
      flaky: all.filter((t) => t.status === 'flaky').length,
      skipped: all.filter((t) => t.status === 'skipped').length,
      timedout: all.filter((t) => t.status === 'timedout').length,
    };
  }, [report]);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/runs/${runId}`}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Run #{runId}
        </Link>
        {loadState === 'ready' && report && (
          <>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-zinc-300">
                {report.stats.total} tests
              </span>
            </div>
          </>
        )}
        {loadState === 'loading' && (
          <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
        )}
        <div className="ml-auto">
          <button
            onClick={fetchResults}
            disabled={loadState === 'loading'}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loadState === 'loading' && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
          {slowLoad && (
            <div className="flex items-center gap-2.5 text-xs text-zinc-500 pt-1 pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              <span>Downloading artifact from GitHub — this only happens once, results are cached after.</span>
            </div>
          )}
        </div>
      )}

      {/* ── Run still in progress ────────────────────────────────────────── */}
      {loadState === 'in_progress' && (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
          <div>
            <p className="text-zinc-200 font-medium">Tests are running…</p>
            <p className="text-sm text-zinc-500 mt-1">
              Results will appear automatically once the run completes.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-3 py-1.5 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Auto-refreshing every 8 seconds
          </div>
        </div>
      )}

      {/* ── No artifact found ────────────────────────────────────────────── */}
      {loadState === 'no_artifact' && (
        <div className="max-w-2xl">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  No Playwright results artifact found
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  The dashboard looks for an artifact named{' '}
                  <code className="bg-amber-500/20 px-1 rounded">playwright-results</code>{' '}
                  containing <code className="bg-amber-500/20 px-1 rounded">results.json</code>.
                </p>
              </div>
            </div>

            {artifactNames.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-zinc-400 mb-2">Available artifacts for this run:</p>
                <div className="flex flex-wrap gap-1.5">
                  {artifactNames.map((name) => (
                    <span
                      key={name}
                      className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <p className="text-xs font-medium text-zinc-300">
                  Add this to your GitHub Actions workflow:
                </p>
              </div>
              <pre className="text-xs text-zinc-400 font-mono whitespace-pre overflow-x-auto leading-relaxed">{`- name: Run Playwright tests
  run: npx playwright test --reporter=json,html

- name: Upload Playwright results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-results
    path: |
      results.json
      test-results/
    retention-days: 30`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {loadState === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-300">Failed to load results</p>
            <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
            <button
              onClick={fetchResults}
              className="mt-3 text-xs text-red-400 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {loadState === 'ready' && report && (
        <div className="space-y-5">
          {/* Stats header */}
          <TestResultsHeader report={report} />

          {/* Filter bar */}
          <ResultsFilter
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            counts={filterCounts as Record<StatusFilter, number>}
          />

          {/* Result count while filtering */}
          {isFiltered && (
            <p className="text-xs text-zinc-500">
              Showing {filteredTests.length} of {report.allTests.length} tests
            </p>
          )}

          {/* Test tree / flat list */}
          <TestSuiteTree
            suites={report.suites}
            runId={runId}
            filteredTests={isFiltered ? filteredTests : undefined}
            isFiltered={isFiltered}
          />
        </div>
      )}
    </div>
  );
}
