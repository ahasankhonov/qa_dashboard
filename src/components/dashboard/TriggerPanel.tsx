'use client';

import { useState } from 'react';
import {
  Play, Shield, Briefcase, Wrench, Smartphone,
  CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

type WorkflowKey = 'admin' | 'manager' | 'technician' | 'flutter';

interface TriggerButtonProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  workflowKey: WorkflowKey;
  endpoint: string;
  comingSoon?: boolean;
  isActiveRun?: boolean;
  onTriggered?: (role: WorkflowKey, runId?: number) => void;
}

function TriggerButton({
  label,
  description,
  icon,
  color,
  workflowKey,
  endpoint,
  comingSoon = false,
  isActiveRun = false,
  onTriggered,
}: TriggerButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleTrigger = async () => {
    if (comingSoon || isActiveRun) return;
    setState('loading');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: workflowKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger workflow');
      setState('success');
      toast.success(`${label} triggered successfully`);
      onTriggered?.(workflowKey, data.runId);
      setTimeout(() => setState('idle'), 3000);
    } catch (err) {
      setState('error');
      toast.error(err instanceof Error ? err.message : 'Trigger failed');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  // ── Coming Soon variant ────────────────────────────────────────────────────
  if (comingSoon) {
    return (
      <div className={cn(
        'relative flex flex-col gap-3 p-5 rounded-xl border text-left w-full',
        'bg-zinc-900/50 border-zinc-800/60 opacity-60 cursor-not-allowed',
      )}>
        <div className="flex items-center justify-between">
          <div className={cn('p-2.5 rounded-lg grayscale', color)}>{icon}</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-400 bg-amber-400/10 border-amber-400/20">
            <Clock className="w-3 h-3" />
            Coming Soon
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-400">{label}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{description}</p>
        </div>
      </div>
    );
  }

  // ── Active variant ─────────────────────────────────────────────────────────
  const isDisabled = state === 'loading' || isActiveRun;

  return (
    <button
      onClick={handleTrigger}
      disabled={isDisabled}
      className={cn(
        'relative flex flex-col gap-3 p-5 rounded-xl border transition-all text-left w-full group',
        'bg-zinc-900 border-zinc-800',
        !isDisabled && 'hover:border-zinc-600',
        isDisabled && 'opacity-60 cursor-not-allowed',
        state === 'success' && 'border-emerald-500/40 bg-emerald-500/5',
        state === 'error' && 'border-red-500/40 bg-red-500/5',
        isActiveRun && state === 'idle' && 'border-blue-500/20',
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn(
          'p-2.5 rounded-lg transition-colors', color,
          state === 'success' && 'bg-emerald-500/15 text-emerald-400',
          state === 'error' && 'bg-red-500/15 text-red-400',
        )}>
          {state === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
           state === 'error'   ? <XCircle className="w-5 h-5" /> : icon}
        </div>

        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
          state === 'loading' || (isActiveRun && state === 'idle')
            ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
            : state === 'success'
            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            : state === 'error'
            ? 'text-red-400 bg-red-400/10 border-red-400/20'
            : 'text-zinc-500 bg-zinc-800 border-zinc-700 group-hover:text-zinc-300',
        )}>
          {state === 'loading' ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Triggering…</>
          ) : isActiveRun && state === 'idle' ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />Running</>
          ) : state === 'success' ? 'Triggered'
            : state === 'error' ? 'Failed'
            : <><Play className="w-3 h-3" />Run</>}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-100">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ─── Web Automation Panel ──────────────────────────────────────────────────────

interface TriggerPanelProps {
  onTriggered?: (role: WorkflowKey, runId?: number) => void;
  activeRoles?: Set<WorkflowKey>;
}

export function TriggerPanel({ onTriggered, activeRoles = new Set() }: TriggerPanelProps) {
  const suites = [
    {
      label: 'Admin Tests',
      description: 'Run full admin role test suite',
      icon: <Shield className="w-5 h-5" />,
      color: 'bg-purple-500/15 text-purple-400',
      workflowKey: 'admin' as WorkflowKey,
      comingSoon: false,
    },
    {
      label: 'Manager Tests',
      description: 'Run manager role test suite',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'bg-blue-500/15 text-blue-400',
      workflowKey: 'manager' as WorkflowKey,
      comingSoon: false,
    },
    {
      label: 'Technician Tests',
      description: 'Run technician role test suite',
      icon: <Wrench className="w-5 h-5" />,
      color: 'bg-orange-500/15 text-orange-400',
      workflowKey: 'technician' as WorkflowKey,
      comingSoon: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {suites.map((suite) => (
        <TriggerButton
          key={suite.workflowKey}
          {...suite}
          endpoint="/api/trigger"
          isActiveRun={activeRoles.has(suite.workflowKey)}
          onTriggered={onTriggered}
        />
      ))}
    </div>
  );
}

// ─── Mobile Automation Panel ───────────────────────────────────────────────────

interface MobileTriggerPanelProps {
  onTriggered?: (role: WorkflowKey, runId?: number) => void;
  isFlutterActive?: boolean;
}

export function MobileTriggerPanel({ onTriggered, isFlutterActive = false }: MobileTriggerPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <TriggerButton
        label="Mobile Tests"
        description="Run Flutter analyze & test suite"
        icon={<Smartphone className="w-5 h-5" />}
        color="bg-cyan-500/15 text-cyan-400"
        workflowKey="flutter"
        endpoint="/api/flutter/trigger"
        isActiveRun={isFlutterActive}
        onTriggered={onTriggered}
      />
    </div>
  );
}
