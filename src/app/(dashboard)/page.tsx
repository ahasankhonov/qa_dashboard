'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, PlayCircle, BarChart3,
  Clock, RefreshCw, Globe, Smartphone,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TriggerPanel, MobileTriggerPanel } from '@/components/dashboard/TriggerPanel';
import { WorkflowTable } from '@/components/dashboard/WorkflowTable';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Header } from '@/components/layout/Header';
import { useWorkflowRuns } from '@/hooks/useWorkflowRuns';
import { usePollRun } from '@/hooks/usePollRun';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/cn';
import type { DashboardStats } from '@/types/dashboard';
import type { WorkflowRun } from '@/types/github';

type WorkflowKey = 'admin' | 'manager' | 'technician' | 'flutter';
type RoleMap = Record<'admin' | 'manager' | 'technician', number | null>;
type HistoryTab = 'web' | 'mobile';

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
    totalRuns: runs.length, passedRuns: passed, failedRuns: failed,
    cancelledRuns: cancelled, successRate, failRate,
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
    for (const [role, workflowId] of Object.entries(roleMap) as ['admin' | 'manager' | 'technician', number | null][]) {
      if (workflowId !== null && run.workflow_id === workflowId) active.add(role);
    }
  }
  if (justTriggered) active.add(justTriggered);
  return active;
}

export default function DashboardPage() {
  // ── Web (Playwright) state ─────────────────────────────────────────────────
  const [pollingRunId, setPollingRunId] = useState<number | null>(null);
  const [roleMap, setRoleMap] = useState<RoleMap>({ admin: null, manager: null, technician: null });
  const [justTriggered, setJustTriggered] = useState<WorkflowKey | null>(null);

  const { runs, isLoading, error, refresh } = useWorkflowRuns({
    perPage: 20,
    pollingInterval: 30_000,
    apiEndpoint: '/api/runs',
  });

  const { run: polledRun, isPolling } = usePollRun(pollingRunId, 5_000, '/api/runs');

  // ── Flutter (Mobile) state ─────────────────────────────────────────────────
  const [flutterPollingRunId, setFlutterPollingRunId] = useState<number | null>(null);
  const [flutterJustTriggered, setFlutterJustTriggered] = useState(false);

  const { runs: flutterRuns, isLoading: flutterLoading, error: flutterError, refresh: flutterRefresh } =
    useWorkflowRuns({ perPage: 20, pollingInterval: 30_000, apiEndpoint: '/api/flutter/runs' });

  const { run: flutterPolledRun, isPolling: flutterIsPolling } = usePollRun(
    flutterPollingRunId, 5_000, '/api/flutter/runs',
  );

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [historyTab, setHistoryTab] = useState<HistoryTab>('web');

  // ── Role map (Web) ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/workflows/role-map')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setRoleMap(data as RoleMap))
      .catch(() => {});
  }, []);

  // ── Clear web polling when run completes ───────────────────────────────────
  useEffect(() => {
    if (polledRun?.status === 'completed') {
      setPollingRunId(null);
      setJustTriggered(null);
      refresh();
    }
  }, [polledRun?.status, refresh]);

  // ── Clear Flutter polling when run completes ───────────────────────────────
  useEffect(() => {
    if (flutterPolledRun?.status === 'completed') {
      setFlutterPollingRunId(null);
      setFlutterJustTriggered(false);
      flutterRefresh();
    }
  }, [flutterPolledRun?.status, flutterRefresh]);

  const activeRoles = computeActiveRoles(runs, roleMap, justTriggered);

  const isFlutterActive =
    flutterJustTriggered ||
    flutterRuns.some((r) =>
      r.status === 'in_progress' || r.status === 'queued' || r.status === 'waiting',
    );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleTriggered = useCallback(
    (role: WorkflowKey, runId?: number) => {
      if (role === 'flutter') {
        setFlutterJustTriggered(true);
        if (runId) setFlutterPollingRunId(runId);
        setTimeout(flutterRefresh, 3000);
      } else {
        setJustTriggered(role);
        if (runId) setPollingRunId(runId);
        setTimeout(refresh, 3000);
      }
    },
    [refresh, flutterRefresh],
  );

  const stats = computeStats(runs);
  const flutterStats = computeStats(flutterRuns);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Monitor and trigger your Playwright test workflows"
        onRefresh={() => { refresh(); flutterRefresh(); }}
        isRefreshing={isLoading || flutterLoading}
      />

      {/* ── Web Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Runs" value={stats.totalRuns} subtitle="Last 20 runs loaded"
              icon={<BarChart3 className="w-4 h-4" />} accent="text-indigo-400" />
            <StatCard title="Pass Rate" value={`${stats.successRate}%`} subtitle={`${stats.passedRuns} passed`}
              icon={<TrendingUp className="w-4 h-4" />}
              accent={stats.successRate === 100 ? 'text-emerald-400' : stats.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'} />
            <StatCard title="Fail Rate" value={`${stats.failRate}%`}
              subtitle={stats.failedRuns > 0 ? `${stats.failedRuns} failed` : 'No failures'}
              icon={<TrendingDown className="w-4 h-4" />}
              accent={stats.failRate === 0 ? 'text-emerald-400' : stats.failRate < 20 ? 'text-yellow-400' : 'text-red-400'} />
            <StatCard title="Last Run"
              value={stats.lastExecutionTime ? formatRelativeTime(stats.lastExecutionTime) : '—'}
              subtitle={stats.latestStatus ? `Status: ${stats.latestStatus}` : 'No runs yet'}
              icon={<Clock className="w-4 h-4" />} accent="text-yellow-400" />
          </>
        )}
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={refresh} /></div>}

      {/* ── Web Automation Trigger ────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-zinc-300">Web Automation</h2>
          {isPolling && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />Polling run status…
            </span>
          )}
        </div>
        <TriggerPanel onTriggered={handleTriggered} activeRoles={activeRoles} />
      </div>

      {/* ── Mobile Automation Trigger ─────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-zinc-300">Mobile Automation</h2>
          {flutterIsPolling && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3 animate-spin" />Polling run status…
            </span>
          )}
          {flutterError && (
            <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded-full">
              Mobile CI unavailable
            </span>
          )}
        </div>
        <MobileTriggerPanel onTriggered={handleTriggered} isFlutterActive={isFlutterActive} />
      </div>

      {/* ── Workflow History (tabbed) ──────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-1">
            <button
              onClick={() => setHistoryTab('web')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                historyTab === 'web'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Globe className="w-3.5 h-3.5" />
              Web Automation
            </button>
            <button
              onClick={() => setHistoryTab('mobile')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                historyTab === 'mobile'
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile Automation
            </button>
          </div>

          <div className="flex items-center gap-3">
            {historyTab === 'web' && (
              <span className="text-xs text-zinc-500">{runs.length} runs shown</span>
            )}
            {historyTab === 'mobile' && (
              <span className="text-xs text-zinc-500">{flutterRuns.length} runs shown</span>
            )}
          </div>
        </div>

        {/* Web history */}
        {historyTab === 'web' && (
          <WorkflowTable runs={runs} isLoading={isLoading} />
        )}

        {/* Mobile history */}
        {historyTab === 'mobile' && (
          <>
            {flutterError ? (
              <div className="px-6 py-8">
                <ErrorAlert message={flutterError} onRetry={flutterRefresh} />
              </div>
            ) : flutterRuns.length === 0 && !flutterLoading ? (
              <div className="px-6 py-12 text-center">
                <Smartphone className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No Flutter CI runs found</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Trigger a Flutter CI run to see results here
                </p>
              </div>
            ) : (
              <WorkflowTable runs={flutterRuns} isLoading={flutterLoading} />
            )}

            {/* Flutter last run summary */}
            {flutterRuns.length > 0 && !flutterLoading && (
              <div className="px-6 py-3 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
                <span>
                  Last Flutter CI run:{' '}
                  <span className={cn(
                    'font-medium',
                    flutterStats.latestStatus === 'success' ? 'text-emerald-400' :
                    flutterStats.latestStatus === 'failure' ? 'text-red-400' : 'text-zinc-400',
                  )}>
                    {flutterStats.latestStatus ?? 'unknown'}
                  </span>
                </span>
                <span>Pass rate: <span className="font-medium text-zinc-300">{flutterStats.successRate}%</span></span>
                <span>Total: <span className="font-medium text-zinc-300">{flutterStats.totalRuns}</span></span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
