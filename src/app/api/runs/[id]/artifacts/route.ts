/**
 * GET /api/runs/[id]/artifacts
 * Returns artifacts for a specific workflow run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listArtifactsForRun } from '@/services/github';

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
    const data = await listArtifactsForRun(runId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /runs/[id]/artifacts]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch artifacts' },
      { status: 500 },
    );
  }
}
