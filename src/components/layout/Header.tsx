'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ title, subtitle, action, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
