/**
 * GET /api/workflows
 * Returns all workflows for the configured repository.
 */

import { NextResponse } from 'next/server';
import { listWorkflows } from '@/services/github';

export async function GET() {
  try {
    const data = await listWorkflows();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API /workflows]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch workflows' },
      { status: 500 },
    );
  }
}
