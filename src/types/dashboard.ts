import type { WorkflowRun, WorkflowRunConclusion } from './github';

export interface DashboardStats {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  successRate: number;
  failRate: number;
  lastExecutionTime: string | null;
  latestStatus: WorkflowRunConclusion;
}

export interface TestSuite {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'technician';
  workflowId: string;
  description: string;
  color: string;
}

export interface RunTriggerState {
  isTriggering: boolean;
  triggeredRunId?: number;
  error?: string;
}

export interface WorkflowHistoryRow {
  run: WorkflowRun;
  durationMs: number | null;
}

export interface PollState {
  isPolling: boolean;
  runId?: number;
}
