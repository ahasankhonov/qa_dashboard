/**
 * GET /api/runs/[id]
 * Returns a single workflow run by ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowRun } from '@/services/github';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const runId = Number(id);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
    }
    const data = await getWorkflowRun(runId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /runs/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch run' },
      { status: 500 },
    );
  }
}
