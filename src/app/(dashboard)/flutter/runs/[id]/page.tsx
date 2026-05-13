'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cpu, RefreshCw, ExternalLink, FlaskConical } from 'lucide-react';
import { RunMetaCard } from '@/components/runs/RunMetaCard';
import { JobsList } from '@/components/runs/JobsList';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePollRun } from '@/hooks/usePollRun';
import type { WorkflowRun, WorkflowJob, Artifact } from '@/types/github';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FlutterRunDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const runId = Number(id);

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shouldPoll = run ? run.status !== 'completed' : false;
  const { run: polledRun } = usePollRun(shouldPoll ? runId : null, 5_000, '/api/flutter/runs');

  useEffect(() => {
    if (polledRun) setRun(polledRun);
  }, [polledRun]);

  const fetchAll = useCallback(async () => {
    if (isNaN(runId)) { setError('Invalid run ID'); setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const [runRes, jobsRes, artifactsRes] = await Promise.all([
        fetch(`/api/flutter/runs/${runId}`),
        fetch(`/api/flutter/runs/${runId}/jobs`),
        fetch(`/api/flutter/runs/${runId}/artifacts`),
      ]);
      if (!runRes.ok) throw new Error(`Failed to fetch run: ${runRes.statusText}`);
      const [runData, jobsData, artifactsData] = await Promise.all([
        runRes.json(),
        jobsRes.ok ? jobsRes.json() : { jobs: [] },
        artifactsRes.ok ? artifactsRes.json() : { artifacts: [] },
      ]);
      setRun(runData);
      setJobs(jobsData.jobs || []);
      setArtifacts(artifactsData.artifacts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const hasDiagnosticsArtifact = artifacts.some((a) =>
    /ci.?diagnostics|test.?results?/i.test(a.name),
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </Link>
        {run && (
          <>
            <span className="text-zinc-700">/</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">{run.name} #{run.run_number}</span>
              <StatusBadge status={run.status} conclusion={run.conclusion} size="sm" />
              {run.status !== 'completed' && (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Live
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {error && <div className="mb-6"><ErrorAlert message={error} onRetry={fetchAll} /></div>}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : run ? (
        <div className="space-y-5">
          <RunMetaCard run={run} />

          {/* View Test Results CTA */}
          {run.status === 'completed' && (
            <Link
              href={`/flutter/runs/${runId}/results`}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                hasDiagnosticsArtifact
                  ? 'bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/15 hover:border-indigo-500/50'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasDiagnosticsArtifact ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${hasDiagnosticsArtifact ? 'text-indigo-300' : 'text-zinc-400'}`}>
                    View Mobile Test Results
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {hasDiagnosticsArtifact
                      ? 'Inline test results & failure details'
                      : 'No ci-diagnostics artifact found for this run'}
                  </p>
                </div>
              </div>
              <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                hasDiagnosticsArtifact
                  ? 'text-indigo-400 border-indigo-500/30 group-hover:bg-indigo-500/20'
                  : 'text-zinc-500 border-zinc-700'
              }`}>
                Open Results →
              </span>
            </Link>
          )}

          {/* Jobs */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Jobs
                {jobs.length > 0 && (
                  <span className="bg-zinc-800 text-zinc-400 text-xs px-1.5 py-0.5 rounded-full">
                    {jobs.length}
                  </span>
                )}
              </div>
              <a
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on GitHub
              </a>
            </div>
            <JobsList jobs={jobs} />
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-500">Run not found</div>
      )}
    </div>
  );
}
