'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import type { NormalizedSuite, NormalizedTestCase } from '@/types/playwright';
import { TestCaseRow } from './TestCaseRow';
import { cn } from '@/lib/cn';

function suiteStats(suite: NormalizedSuite): { total: number; passed: number; failed: number } {
  const all = collectTests(suite);
  return {
    total: all.length,
    passed: all.filter((t) => t.status === 'passed').length,
    failed: all.filter((t) => t.status === 'failed' || t.status === 'timedout').length,
  };
}

function collectTests(suite: NormalizedSuite): NormalizedTestCase[] {
  return [...suite.tests, ...suite.children.flatMap(collectTests)];
}

interface SuiteNodeProps {
  suite: NormalizedSuite;
  runId: number;
  depth?: number;
  defaultOpen?: boolean;
}

function SuiteNode({ suite, runId, depth = 0, defaultOpen = true }: SuiteNodeProps) {
  const stats = suiteStats(suite);
  const hasFailed = stats.failed > 0;
  const [open, setOpen] = useState(defaultOpen || hasFailed);

  const allTests = collectTests(suite);
  if (allTests.length === 0) return null;

  return (
    <div className={cn(depth > 0 && 'ml-4 border-l border-zinc-800/60 pl-3')}>
      {/* Suite header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-1 text-left group hover:bg-zinc-800/30 rounded-lg transition-colors"
      >
        <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0">
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        <FileCode2 className="w-4 h-4 text-zinc-600 flex-shrink-0" />
        <span className="text-sm font-medium text-zinc-300 flex-1 min-w-0 truncate">
          {suite.title || suite.file}
        </span>
        {/* Mini stats */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {stats.failed > 0 && (
            <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
              {stats.failed} failed
            </span>
          )}
          <span className="text-xs text-zinc-500">
            {stats.passed}/{stats.total}
          </span>
        </div>
      </button>

      {/* Suite children */}
      {open && (
        <div className="space-y-2 mt-1 mb-2">
          {/* Direct test cases */}
          {suite.tests.map((test) => (
            <TestCaseRow key={test.id} test={test} runId={runId} />
          ))}
          {/* Nested suites */}
          {suite.children.map((child, i) => (
            <SuiteNode
              key={i}
              suite={child}
              runId={runId}
              depth={depth + 1}
              defaultOpen={hasFailed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TestSuiteTreeProps {
  suites: NormalizedSuite[];
  runId: number;
  filteredTests?: NormalizedTestCase[];
  isFiltered?: boolean;
}

export function TestSuiteTree({ suites, runId, filteredTests, isFiltered }: TestSuiteTreeProps) {
  // When filtering, show a flat list instead of the tree
  if (isFiltered && filteredTests) {
    if (filteredTests.length === 0) {
      return (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No tests match the current filter
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {filteredTests.map((test) => (
          <TestCaseRow key={test.id} test={test} runId={runId} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {suites.map((suite, i) => (
        <SuiteNode key={i} suite={suite} runId={runId} depth={0} />
      ))}
    </div>
  );
}
