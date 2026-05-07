/**
 * POST /api/trigger
 * Triggers a workflow_dispatch event for admin, manager, or technician test suites.
 *
 * Body: { role: 'admin' | 'manager' | 'technician', branch?: string, inputs?: Record<string, string> }
 *
 * Security: GITHUB_TOKEN is read from env and never exposed to the client.
 * The response only contains status; no token data is returned.
 */

import { NextRequest, NextResponse } from 'next/server';
import { triggerWorkflow, listWorkflowRuns } from '@/services/github';

const ROLE_WORKFLOW_MAP: Record<string, string | undefined> = {
  admin: process.env.GITHUB_ADMIN_WORKFLOW_ID,
  manager: process.env.GITHUB_MANAGER_WORKFLOW_ID,
  technician: process.env.GITHUB_TECHNICIAN_WORKFLOW_ID,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, branch, inputs } = body as {
      role: string;
      branch?: string;
      inputs?: Record<string, string>;
    };

    if (!role || !ROLE_WORKFLOW_MAP[role]) {
      // Fall back to a single generic workflow ID if role-specific ones aren't set
      const genericWorkflowId = process.env.GITHUB_WORKFLOW_ID;
      if (!genericWorkflowId) {
        return NextResponse.json(
          {
            error: `No workflow ID configured for role "${role}". Set GITHUB_${role.toUpperCase()}_WORKFLOW_ID or GITHUB_WORKFLOW_ID.`,
          },
          { status: 400 },
        );
      }

      await triggerWorkflow(genericWorkflowId, {
        ref: branch || process.env.GITHUB_DEFAULT_BRANCH || 'main',
        inputs,
      });

      // GitHub takes a moment to register the new run — wait briefly then fetch the latest
      await new Promise((res) => setTimeout(res, 2000));
      const runs = await listWorkflowRuns(genericWorkflowId, 1, 1);
      const latestRun = runs.workflow_runs[0];

      return NextResponse.json({ success: true, runId: latestRun?.id });
    }

    const workflowId = ROLE_WORKFLOW_MAP[role]!;

    await triggerWorkflow(workflowId, {
      ref: branch || process.env.GITHUB_DEFAULT_BRANCH || 'main',
      inputs,
    });

    // Short delay so the new run is visible in the runs list
    await new Promise((res) => setTimeout(res, 2000));
    const runs = await listWorkflowRuns(workflowId, 1, 1);
    const latestRun = runs.workflow_runs[0];

    return NextResponse.json({ success: true, runId: latestRun?.id });
  } catch (error) {
    console.error('[API /trigger]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger workflow' },
      { status: 500 },
    );
  }
}
