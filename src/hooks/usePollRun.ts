'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkflowRun } from '@/types/github';

/**
 * Poll a single workflow run until it reaches a terminal state.
 * Automatically stops when status === 'completed'.
 * Uses AbortController to prevent state updates after unmount.
 */
export function usePollRun(runId: number | null, intervalMs = 5000) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!runId) {
      stopPolling();
      setRun(null);
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/runs/${runId}`, { signal: controller.signal });
        if (!res.ok) return;
        const data: WorkflowRun = await res.json();
        setRun(data);
        if (data.status === 'completed') stopPolling();
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // silent — polling will retry on next interval
        }
      }
    };

    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [runId, intervalMs, stopPolling]);

  return { run, isPolling };
}
