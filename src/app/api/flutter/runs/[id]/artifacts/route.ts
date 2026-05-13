/**
 * GET /api/flutter/runs/[id]/artifacts
 * Returns artifacts for a single Flutter CI workflow run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listFlutterArtifactsForRun } from '@/services/github';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const runId = Number(id);
    if (isNaN(runId)) {
      return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
    }
    const data = await listFlutterArtifactsForRun(runId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /flutter/runs/[id]/artifacts]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Flutter artifacts' },
      { status: 500 },
    );
  }
}
