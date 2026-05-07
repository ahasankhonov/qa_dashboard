/**
 * GET /api/runs
 * Lists workflow runs. Optionally filtered by workflow_id.
 * All GitHub API calls are server-side — the token never reaches the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listWorkflowRuns } from '@/services/github';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflow_id') || undefined;
    const perPage = Number(searchParams.get('per_page') || '30');
    const page = Number(searchParams.get('page') || '1');

    const data = await listWorkflowRuns(workflowId, perPage, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /runs]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch runs' },
      { status: 500 },
    );
  }
}
