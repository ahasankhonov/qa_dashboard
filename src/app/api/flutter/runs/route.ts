/**
 * GET /api/flutter/runs
 * Lists Flutter CI workflow runs from the mobile repo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listFlutterWorkflowRuns } from '@/services/github';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const perPage = Number(searchParams.get('per_page') || '20');
    const page = Number(searchParams.get('page') || '1');

    const data = await listFlutterWorkflowRuns(perPage, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /flutter/runs]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Flutter runs' },
      { status: 500 },
    );
  }
}
