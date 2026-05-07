'use client';

import { ExternalLink, CheckCircle2, XCircle, Loader2, Circle, Clock } from 'lucide-react';
import type { WorkflowJob, WorkflowStep } from '@/types/github';
import { StatusBadge } from '@/components/ui';
import { formatDuration } from '@/utils/format';
import { cn } from '@/lib/cn';

// ── Step pill shown in the horizontal pipeline ────────────────────────────────

function stepDuration(step: WorkflowStep): number | null {
  if (!step.started_at || !step.completed_at) return null;
  return new Date(step.completed_at).getTime() - new Date(step.started_at).getTime();
}

type StepState = 'success' | 'failure' | 'running' | 'skipped' | 'pending';

function getStepState(step: WorkflowStep): StepState {
  if (step.status === 'in_progress') return 'running';
  if (step.conclusion === 'success') return 'success';
  if (step.conclusion === 'failure') return 'failure';
  if (step.conclusion === 'skipped') return 'skipped';
  return 'pending';
}

const STEP_STYLES: Record<StepState, { pill: string; icon: React.ReactNode; connector: string }> = {
  success: {
    pill: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />,
    connector: 'bg-emerald-500/30',
  },
  failure: {
    pill: 'border-red-500/40 bg-red-500/10 text-red-300',
    icon: <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />,
    connector: 'bg-red-500/30',
  },
  running: {
    pill: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
    icon: <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0" />,
    connector: 'bg-blue-500/30',
  },
  skipped: {
    pill: 'border-zinc-700 bg-zinc-800/40 text-zinc-500',
    icon: <Circle className="w-3 h-3 text-zinc-600 flex-shrink-0" />,
    connector: 'bg-zinc-700/40',
  },
  pending: {
    pill: 'border-zinc-700 bg-zinc-800/40 text-zinc-500',
    icon: <Circle className="w-3 h-3 text-zinc-600 flex-shrink-0" />,
    connector: 'bg-zinc-700/40',
  },
};

function StepPill({ step, isLast }: { step: WorkflowStep; isLast: boolean }) {
  const state = getStepState(step);
  const style = STEP_STYLES[state];
  const dur = stepDuration(step);

  return (
    <div className="flex items-center">
      {/* Pill */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all',
          style.pill,
        )}
        title={`${step.name}${dur ? ` · ${formatDuration(dur)}` : ''}`}
      >
        {style.icon}
        <span className="max-w-[120px] truncate">{step.name}</span>
        {dur !== null && dur > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] opacity-60 tabular-nums ml-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatDuration(dur)}
          </span>
        )}
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <div className="flex items-center mx-1 flex-shrink-0">
          <div className={cn('h-px w-4', style.connector)} />
          <div
            className={cn(
              'w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px]',
              state === 'success'
                ? 'border-l-emerald-500/30'
                : state === 'failure'
                ? 'border-l-red-500/30'
                : state === 'running'
                ? 'border-l-blue-500/30'
                : 'border-l-zinc-700/40',
            )}
          />
        </div>
      )}
    </div>
  );
}

// ── Job card with horizontal step pipeline ────────────────────────────────────

function JobCard({ job }: { job: WorkflowJob }) {
  const duration =
    job.started_at && job.completed_at
      ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
      : null;

  // Filter out the auto-injected "Set up job" / "Complete job" wrapper steps
  // if there are real steps — keeps the pipeline focused
  const steps = job.steps ?? [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Job header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-200 truncate">{job.name}</p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {duration !== null && (
            <span className="flex items-center gap-1 text-xs text-zinc-500 tabular-nums">
              <Clock className="w-3 h-3" />
              {formatDuration(duration)}
            </span>
          )}
          <StatusBadge status={job.status} conclusion={job.conclusion} size="sm" />
          <a
            href={job.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded"
            title="View on GitHub"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Horizontal step pipeline */}
      {steps.length > 0 && (
        <div className="px-4 py-3 overflow-x-auto">
          <div className="flex items-center min-w-max gap-0">
            {steps.map((step, i) => (
              <StepPill key={step.number} step={step} isLast={i === steps.length - 1} />
            ))}
          </div>
        </div>
      )}

      {steps.length === 0 && (
        <div className="px-4 py-3 text-xs text-zinc-600 italic">No step data available</div>
      )}
    </div>
  );
}

// ── Public export ──────────────────────────────────────────────────────────────

export function JobsList({ jobs }: { jobs: WorkflowJob[] }) {
  if (jobs.length === 0) {
    return <p className="text-sm text-zinc-500 py-4">No jobs found for this run.</p>;
  }
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
