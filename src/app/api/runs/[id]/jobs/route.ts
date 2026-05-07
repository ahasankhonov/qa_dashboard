/**
 * GET /api/runs/[id]/jobs
 * Returns jobs (and their steps) for a specific workflow run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listJobsForRun } from '@/services/github';

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
    const data = await listJobsForRun(runId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /runs/[id]/jobs]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch jobs' },
      { status: 500 },
    );
  }
}
