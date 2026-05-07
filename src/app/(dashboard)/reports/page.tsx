'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Filter, Search, SortAsc, SortDesc } from 'lucide-react';
import { RunCard } from '@/components/reports/RunCard';
import { RunCardSkeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Header } from '@/components/layout/Header';
import type { WorkflowRun } from '@/types/github';
import type { WorkflowRunConclusion } from '@/types/github';

type SortOrder = 'desc' | 'asc';
type FilterConclusion = WorkflowRunConclusion | 'all' | 'running';

const FILTER_OPTIONS: { label: string; value: FilterConclusion }[] = [
  { label: 'All', value: 'all' },
  { label: 'Passed', value: 'success' },
  { label: 'Failed', value: 'failure' },
  { label: 'Running', value: 'running' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function ReportsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterConclusion>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/runs?per_page=50');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      setRuns(data.workflow_runs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

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
        onRefresh={fetchRuns}
        isRefreshing={isLoading}
      />

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
          <ErrorAlert message={error} onRetry={fetchRuns} />
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
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
