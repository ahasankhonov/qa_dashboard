'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PlayCircle,
  BarChart3,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TriggerPanel } from '@/components/dashboard/TriggerPanel';
import { WorkflowTable } from '@/components/dashboard/WorkflowTable';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Header } from '@/components/layout/Header';
import { useWorkflowRuns } from '@/hooks/useWorkflowRuns';
import { usePollRun } from '@/hooks/usePollRun';
import { formatRelativeTime } from '@/utils/format';
import type { DashboardStats } from '@/types/dashboard';
import type { WorkflowRun } from '@/types/github';

type WorkflowKey = 'admin' | 'manager' | 'technician';
type RoleMap = Record<WorkflowKey, number | null>;

function computeStats(runs: WorkflowRun[]): DashboardStats {
  const completed = runs.filter((r) => r.status === 'completed');
  const passed = completed.filter((r) => r.conclusion === 'success').length;
  const failed = completed.filter(
    (r) => r.conclusion === 'failure' || r.conclusion === 'timed_out',
  ).length;
  const cancelled = completed.filter((r) => r.conclusion === 'cancelled').length;
  const latest = runs[0];

  const successRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;
  const failRate    = completed.length > 0 ? Math.round((failed / completed.length) * 100) : 0;

  return {
    totalRuns: runs.length,
    passedRuns: passed,
    failedRuns: failed,
    cancelledRuns: cancelled,
    successRate,
    failRate,
    lastExecutionTime: latest ? latest.created_at : null,
    latestStatus: latest?.conclusion ?? null,
  };
}

function computeActiveRoles(
  runs: WorkflowRun[],
  roleMap: RoleMap,
  justTriggered: WorkflowKey | null,
): Set<WorkflowKey> {
  const active = new Set<WorkflowKey>();

  const activeStatuses = new Set(['in_progress', 'queued', 'waiting', 'requested', 'pending']);

  for (const run of runs) {
    if (!activeStatuses.has(run.status)) continue;
    for (const [role, workflowId] of Object.entries(roleMap) as [WorkflowKey, number | null][]) {
      if (workflowId !== null && run.workflow_id === workflowId) {
        active.add(role);
      }
    }
  }

  // Immediately reflect a just-triggered role before the next poll catches up
  if (justTriggered) active.add(justTriggered);

  return active;
}

export default function DashboardPage() {
  const [pollingRunId, setPollingRunId] = useState<number | null>(null);
  const [roleMap, setRoleMap] = useState<RoleMap>({ admin: null, manager: null, technician: null });
  const [justTriggered, setJustTriggered] = useState<WorkflowKey | null>(null);

  const { runs, isLoading, error, refresh } = useWorkflowRuns({
    perPage: 20,
    pollingInterval: 30_000,
  });

  const { run: polledRun, isPolling } = usePollRun(pollingRunId, 5_000);

  // Fetch role → workflow ID mapping once on mount (non-critical, falls back gracefully)
  useEffect(() => {
    fetch('/api/workflows/role-map')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setRoleMap(data as RoleMap))
      .catch(() => {/* role-map unavailable — active-run highlighting disabled */});
  }, []);

  // Clear pollingRunId once the triggered run finishes
  useEffect(() => {
    if (polledRun?.status === 'completed') {
      setPollingRunId(null);
      setJustTriggered(null);
      refresh();
    }
  }, [polledRun?.status, refresh]);

  const activeRoles = computeActiveRoles(runs, roleMap, justTriggered);

  const handleTriggered = useCallback(
    (role: WorkflowKey, runId?: number) => {
      setJustTriggered(role);
      if (runId) setPollingRunId(runId);
      setTimeout(refresh, 3000);
    },
    [refresh],
  );

  const stats = computeStats(runs);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Monitor and trigger your Playwright test workflows"
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Runs"
              value={stats.totalRuns}
              subtitle="Last 20 runs loaded"
              icon={<BarChart3 className="w-4 h-4" />}
              accent="text-indigo-400"
            />
            <StatCard
              title="Pass Rate"
              value={`${stats.successRate}%`}
              subtitle={`${stats.passedRuns} passed`}
              icon={<TrendingUp className="w-4 h-4" />}
              accent={stats.successRate === 100 ? 'text-emerald-400' : stats.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'}
            />
            <StatCard
              title="Fail Rate"
              value={`${stats.failRate}%`}
              subtitle={stats.failedRuns > 0 ? `${stats.failedRuns} failed` : 'No failures'}
              icon={<TrendingDown className="w-4 h-4" />}
              accent={stats.failRate === 0 ? 'text-emerald-400' : stats.failRate < 20 ? 'text-yellow-400' : 'text-red-400'}
            />
            <StatCard
              title="Last Run"
              value={stats.lastExecutionTime ? formatRelativeTime(stats.lastExecutionTime) : '—'}
              subtitle={stats.latestStatus ? `Status: ${stats.latestStatus}` : 'No runs yet'}
              icon={<Clock className="w-4 h-4" />}
              accent="text-yellow-400"
            />
          </>
        )}
      </div>

      {error && (
        <div className="mb-6">
          <ErrorAlert message={error} onRetry={refresh} />
        </div>
      )}

      {/* Trigger Panel */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <PlayCircle className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-300">Run Tests</h2>
          {isPolling && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Polling run status…
            </span>
          )}
        </div>
        <TriggerPanel onTriggered={handleTriggered} activeRoles={activeRoles} />
      </div>

      {/* Workflow History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">Workflow History</h2>
          <span className="text-xs text-zinc-500">{runs.length} runs shown</span>
        </div>
        <WorkflowTable runs={runs} isLoading={isLoading} />
      </div>
    </div>
  );
}
