'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkflowRun } from '@/types/github';

interface UseWorkflowRunsOptions {
  workflowId?: string;
  pollingInterval?: number; // ms, 0 = no polling
  perPage?: number;
}

interface UseWorkflowRunsResult {
  runs: WorkflowRun[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflowRuns({
  workflowId,
  pollingInterval = 0,
  perPage = 30,
}: UseWorkflowRunsOptions = {}): UseWorkflowRunsResult {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    try {
      const params = new URLSearchParams({ per_page: String(perPage) });
      if (workflowId) params.set('workflow_id', workflowId);
      const res = await fetch(`/api/runs?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch runs: ${res.statusText}`);
      const data = await res.json();
      setRuns(data.workflow_runs);
      setTotalCount(data.total_count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, perPage]);

  useEffect(() => {
    setIsLoading(true);
    fetchRuns();
  }, [fetchRuns]);

  // Optional auto-refresh polling
  useEffect(() => {
    if (!pollingInterval) return;
    const id = setInterval(fetchRuns, pollingInterval);
    return () => clearInterval(id);
  }, [fetchRuns, pollingInterval]);

  return { runs, totalCount, isLoading, error, refresh: fetchRuns };
}
