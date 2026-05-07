import {
  GitBranch,
  Clock,
  Hash,
  User,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import type { WorkflowRun } from '@/types/github';
import { StatusBadge } from '@/components/ui';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/format';
import { computeDuration } from '@/services/github';

interface RunMetaCardProps {
  run: WorkflowRun;
}

export function RunMetaCard({ run }: RunMetaCardProps) {
  const duration = computeDuration(run.run_started_at, run.updated_at);

  const metaItems = [
    {
      icon: <Hash className="w-4 h-4" />,
      label: 'Run Number',
      value: `#${run.run_number}`,
    },
    {
      icon: <GitBranch className="w-4 h-4" />,
      label: 'Branch',
      value: (
        <span className="font-mono text-xs bg-zinc-800 px-2 py-0.5 rounded">
          {run.head_branch}
        </span>
      ),
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Duration',
      value: run.status === 'completed' ? formatDuration(duration) : 'In progress…',
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Started',
      value: formatDateTime(run.run_started_at),
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Updated',
      value: formatRelativeTime(run.updated_at),
    },
    {
      icon: <User className="w-4 h-4" />,
      label: 'Triggered by',
      value: run.triggering_actor?.login || run.actor?.login || 'Unknown',
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            {run.name || `Workflow Run #${run.run_number}`}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Triggered by {run.event} event
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} conclusion={run.conclusion} />
          <a
            href={run.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="View on GitHub"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {metaItems.map(({ icon, label, value }) => (
          <div key={label}>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
              {icon}
              {label}
            </div>
            <div className="text-sm text-zinc-200">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
