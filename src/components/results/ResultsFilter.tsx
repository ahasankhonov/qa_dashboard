'use client';

import { Search, X } from 'lucide-react';
import type { TestStatus } from '@/types/playwright';

export type StatusFilter = TestStatus | 'all';

interface ResultsFilterProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: '' },
  { value: 'passed', label: 'Passed', color: 'text-emerald-400' },
  { value: 'failed', label: 'Failed', color: 'text-red-400' },
  { value: 'flaky', label: 'Flaky', color: 'text-yellow-400' },
  { value: 'skipped', label: 'Skipped', color: 'text-zinc-400' },
];

export function ResultsFilter({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  counts,
}: ResultsFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search tests by name, suite, or error…"
          className="w-full pl-9 pr-9 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-shrink-0">
        {STATUS_OPTIONS.map(({ value, label, color }) => {
          const count = counts[value] ?? 0;
          const active = statusFilter === value;
          return (
            <button
              key={value}
              onClick={() => onStatusFilterChange(value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : `text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 ${color}`
              }`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-indigo-500/60' : 'bg-zinc-800'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
