/**
 * POST /api/trigger
 * Triggers a workflow_dispatch event for admin, manager, or technician test suites.
 * Body: { role: 'admin' | 'manager' | 'technician', branch?: string, inputs?: Record<string, string> }
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerWorkflow, listWorkflowRuns } from '@/services/github';

const ROLE_WORKFLOW_MAP: Record<string, string | undefined> = {
  admin:       process.env.GITHUB_ADMIN_WORKFLOW_ID,
  manager:     process.env.GITHUB_MANAGER_WORKFLOW_ID,
  technician:  process.env.GITHUB_TECHNICIAN_WORKFLOW_ID,
};

async function getLatestRunId(workflowId: string): Promise<number | undefined> {
  // Give GitHub a moment to register the new run, then poll briefly
  await new Promise((r) => setTimeout(r, 2500));
  const runs = await listWorkflowRuns(workflowId, 5, 1);
  const latest = runs.workflow_runs.find(
    (r) => r.status === 'queued' || r.status === 'in_progress' || r.status === 'waiting',
  ) ?? runs.workflow_runs[0];
  return latest?.id;
}

export async function POST(request: NextRequest) {
  let workflowId = 'unknown';

  try {
    const body = await request.json();
    const { role, branch, inputs } = body as {
      role: string;
      branch?: string;
      inputs?: Record<string, string>;
    };

    workflowId = ROLE_WORKFLOW_MAP[role] ?? process.env.GITHUB_WORKFLOW_ID ?? 'unknown';

    if (workflowId === 'unknown') {
      return NextResponse.json(
        {
          error: `No workflow ID configured for role "${role}". Set GITHUB_${role.toUpperCase()}_WORKFLOW_ID in your .env.local.`,
        },
        { status: 400 },
      );
    }

    await triggerWorkflow(workflowId, {
      ref: branch || process.env.GITHUB_DEFAULT_BRANCH || 'main',
      inputs,
    });

    // Best-effort: get the new run ID — don't fail the whole request if this times out
    let runId: number | undefined;
    try {
      runId = await getLatestRunId(workflowId);
    } catch {
      // Non-critical — the trigger already succeeded
    }

    return NextResponse.json({ success: true, runId });
  } catch (error) {
    console.error('[API /trigger]', error);
    const raw = error instanceof Error ? error.message : 'Failed to trigger workflow';

    // Replace the generic GitHub 404 message with something actionable
    const message =
      raw.includes('not found') || raw.includes('Repository or resource')
        ? `Workflow "${workflowId}" not found on GitHub. Check the file name in .env.local (GITHUB_*_WORKFLOW_ID) and make sure it has "on: workflow_dispatch:" configured.`
        : raw;

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
