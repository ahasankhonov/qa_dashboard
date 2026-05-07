'use client';

import { useState, useEffect, useRef } from 'react';
import type { WorkflowRun } from '@/types/github';

/**
 * Poll a single workflow run until it reaches a terminal state.
 * Automatically stops when status === 'completed'.
 */
export function usePollRun(runId: number | null, intervalMs = 5000) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  };

  useEffect(() => {
    if (!runId) return;

    setIsPolling(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) return;
        const data: WorkflowRun = await res.json();
        setRun(data);
        if (data.status === 'completed') stopPolling();
      } catch {
        // silent — polling will retry
      }
    };

    poll(); // immediate first fetch
    intervalRef.current = setInterval(poll, intervalMs);

    return stopPolling;
  }, [runId, intervalMs]);

  return { run, isPolling };
}
