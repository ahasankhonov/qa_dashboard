import { cn } from '@/lib/cn';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  accent?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'text-indigo-400',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        <div className={cn('p-2 rounded-lg bg-zinc-800', accent)}>{icon}</div>
      </div>

      <div>
        <p className="text-2xl font-bold text-zinc-100 tabular-nums">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>

      {trend && (
        <div className="flex items-center gap-1">
          {trend.value >= 0 ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-red-400" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend.value >= 0 ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}%
          </span>
          <span className="text-xs text-zinc-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
