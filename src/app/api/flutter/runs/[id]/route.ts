/**
 * GET /api/flutter/runs/[id]
 * Returns a single Flutter CI workflow run.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFlutterWorkflowRun } from '@/services/github';

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
    const run = await getFlutterWorkflowRun(runId);
    return NextResponse.json(run);
  } catch (error) {
    console.error('[API /flutter/runs/[id]]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Flutter run' },
      { status: 500 },
    );
  }
}
