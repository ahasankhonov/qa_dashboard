'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Filter, Search, SortAsc, SortDesc, Globe, Smartphone } from 'lucide-react';
import { RunCard } from '@/components/reports/RunCard';
import { RunCardSkeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/cn';
import type { WorkflowRun } from '@/types/github';
import type { WorkflowRunConclusion } from '@/types/github';

type SortOrder = 'desc' | 'asc';
type FilterConclusion = WorkflowRunConclusion | 'all' | 'running';
type ReportTab = 'web' | 'mobile';

const FILTER_OPTIONS: { label: string; value: FilterConclusion }[] = [
  { label: 'All', value: 'all' },
  { label: 'Passed', value: 'success' },
  { label: 'Failed', value: 'failure' },
  { label: 'Running', value: 'running' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('web');
  const [webRuns, setWebRuns] = useState<WorkflowRun[]>([]);
  const [mobileRuns, setMobileRuns] = useState<WorkflowRun[]>([]);
  const [isWebLoading, setIsWebLoading] = useState(true);
  const [isMobileLoading, setIsMobileLoading] = useState(true);
  const [webError, setWebError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterConclusion>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const makeFetcher = (
    endpoint: string,
    setRuns: (r: WorkflowRun[]) => void,
    setLoading: (v: boolean) => void,
    setError: (e: string | null) => void,
  ) => async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      setRuns(data.workflow_runs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWebRuns = useCallback(
    makeFetcher('/api/runs?per_page=50', setWebRuns, setIsWebLoading, setWebError),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fetchMobileRuns = useCallback(
    makeFetcher('/api/flutter/runs?per_page=50', setMobileRuns, setIsMobileLoading, setMobileError),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    fetchWebRuns();
    fetchMobileRuns();
  }, [fetchWebRuns, fetchMobileRuns]);

  const runs = activeTab === 'web' ? webRuns : mobileRuns;
  const isLoading = activeTab === 'web' ? isWebLoading : isMobileLoading;
  const error = activeTab === 'web' ? webError : mobileError;
  const onRetry = activeTab === 'web' ? fetchWebRuns : fetchMobileRuns;
  const basePath = activeTab === 'web' ? '/runs' : '/flutter/runs';

  const filtered = runs
    .filter((run) => {
      if (filter === 'all') return true;
      if (filter === 'running') return run.status !== 'completed';
      return run.conclusion === filter;
    })
    .filter((run) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        run.name?.toLowerCase().includes(q) ||
        String(run.run_number).includes(q) ||
        run.head_branch.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  return (
    <div>
      <Header
        title="Reports"
        subtitle="Browse all test run reports and artifacts"
        onRefresh={() => { fetchWebRuns(); fetchMobileRuns(); }}
        isRefreshing={isWebLoading || isMobileLoading}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('web')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            activeTab === 'web' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Globe className="w-3.5 h-3.5" />
          Web Automation
        </button>
        <button
          onClick={() => setActiveTab('mobile')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            activeTab === 'mobile' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Smartphone className="w-3.5 h-3.5" />
          Mobile Automation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, run number, or branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
        >
          {sortOrder === 'desc' ? (
            <SortDesc className="w-4 h-4" />
          ) : (
            <SortAsc className="w-4 h-4" />
          )}
          {sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorAlert message={error} onRetry={onRetry} />
        </div>
      )}

      {/* Count */}
      {!isLoading && !error && (
        <p className="text-xs text-zinc-500 mb-4">
          {filtered.length} run{filtered.length !== 1 ? 's' : ''} shown
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RunCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-10 h-10" />}
          title="No runs found"
          description={
            search || filter !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Trigger a test run from the Dashboard to see results here.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((run) => (
            <RunCard key={run.id} run={run} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}
