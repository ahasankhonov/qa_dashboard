import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Repeat2,
  Clock,
  BarChart3,
} from 'lucide-react';
import type { NormalizedReport } from '@/types/playwright';
import { formatDuration } from '@/utils/format';

interface TestResultsHeaderProps {
  report: NormalizedReport;
}

export function TestResultsHeader({ report }: TestResultsHeaderProps) {
  const { stats, duration } = report;
  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  const chips = [
    {
      label: 'Total',
      value: stats.total,
      icon: <BarChart3 className="w-4 h-4" />,
      color: 'text-zinc-300 bg-zinc-800 border-zinc-700',
    },
    {
      label: 'Passed',
      value: stats.passed,
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: <XCircle className="w-4 h-4" />,
      color: 'text-red-400 bg-red-400/10 border-red-400/20',
    },
    {
      label: 'Skipped',
      value: stats.skipped,
      icon: <MinusCircle className="w-4 h-4" />,
      color: 'text-zinc-400 bg-zinc-800 border-zinc-700',
    },
    {
      label: 'Flaky',
      value: stats.flaky,
      icon: <Repeat2 className="w-4 h-4" />,
      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    },
    {
      label: 'Duration',
      value: formatDuration(duration),
      icon: <Clock className="w-4 h-4" />,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      {/* Pass rate bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-zinc-400">Pass rate</span>
          <span
            className={`text-sm font-bold ${
              passRate === 100
                ? 'text-emerald-400'
                : passRate >= 80
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {passRate}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              passRate === 100
                ? 'bg-emerald-500'
                : passRate >= 80
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(({ label, value, icon, color }) => (
          <div
            key={label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${color}`}
          >
            {icon}
            <span className="tabular-nums font-bold">{value}</span>
            <span className="text-xs font-normal opacity-70">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
