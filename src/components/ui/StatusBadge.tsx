import { cn } from '@/lib/cn';
import {
  getStatusVariant,
  getStatusLabel,
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  type StatusVariant,
} from '@/utils/status';
import type { WorkflowRunStatus, WorkflowRunConclusion } from '@/types/github';
import { CheckCircle2, XCircle, Clock, Loader2, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const ICONS: Record<StatusVariant, React.ReactNode> = {
  success: <CheckCircle2 className="w-3.5 h-3.5" />,
  failure: <XCircle className="w-3.5 h-3.5" />,
  running: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5" />,
  cancelled: <MinusCircle className="w-3.5 h-3.5" />,
  neutral: <MinusCircle className="w-3.5 h-3.5" />,
};

export function StatusBadge({
  status,
  conclusion,
  showIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const variant = getStatusVariant(status, conclusion);
  const label = getStatusLabel(status, conclusion);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        STATUS_COLORS[variant],
        className,
      )}
    >
      {showIcon && ICONS[variant]}
      {label}
    </span>
  );
}

interface StatusDotProps {
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
}

export function StatusDot({ status, conclusion }: StatusDotProps) {
  const variant = getStatusVariant(status, conclusion);
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full', STATUS_DOT_COLORS[variant])} />
  );
}
