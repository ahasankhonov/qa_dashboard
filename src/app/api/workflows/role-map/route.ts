/**
 * GET /api/workflows/role-map
 *
 * Returns the numeric GitHub workflow ID for each role, resolved by matching
 * the .yml file name from env vars against the repository's workflow list.
 *
 * Response: { admin: number | null, manager: number | null, technician: number | null }
 */

import { NextResponse } from 'next/server';
import { listWorkflows } from '@/services/github';

const ROLE_FILE_MAP = {
  admin:      process.env.GITHUB_ADMIN_WORKFLOW_ID,
  manager:    process.env.GITHUB_MANAGER_WORKFLOW_ID,
  technician: process.env.GITHUB_TECHNICIAN_WORKFLOW_ID,
} as const;

export async function GET() {
  try {
    const { workflows } = await listWorkflows();

    const result: Record<string, number | null> = {};

    for (const [role, fileId] of Object.entries(ROLE_FILE_MAP)) {
      if (!fileId) {
        result[role] = null;
        continue;
      }
      const match = workflows.find(
        (w) =>
          w.path.endsWith(`/${fileId}`) ||
          w.path === fileId ||
          w.id.toString() === fileId,
      );
      result[role] = match?.id ?? null;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /workflows/role-map]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve workflow roles' },
      { status: 500 },
    );
  }
}
