'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const abortRef = useRef<AbortController | null>(null);

  const fetchRuns = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({ per_page: String(perPage) });
      if (workflowId) params.set('workflow_id', workflowId);
      const res = await fetch(`/api/runs?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to fetch runs: ${res.statusText}`);
      const data = await res.json();
      setRuns(data.workflow_runs ?? []);
      setTotalCount(data.total_count ?? 0);
      setError(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [workflowId, perPage]);

  // Initial fetch + re-fetch when dependencies change
  useEffect(() => {
    fetchRuns();
    return () => { abortRef.current?.abort(); };
  }, [fetchRuns]);

  // Optional auto-refresh polling
  useEffect(() => {
    if (!pollingInterval) return;
    const id = setInterval(fetchRuns, pollingInterval);
    return () => clearInterval(id);
  }, [fetchRuns, pollingInterval]);

  return { runs, totalCount, isLoading, error, refresh: fetchRuns };
}
