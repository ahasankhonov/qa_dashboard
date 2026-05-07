/**
 * GET /api/runs/[id]/playwright-results
 *
 * Downloads the Playwright JSON artifact for a workflow run, parses it, and
 * returns a NormalizedReport with screenshots embedded as base64.
 *
 * Returns 404 when no playwright artifact is found.
 * Returns 202 (Accepted) when the run is still in progress (no artifacts yet).
 */

import { NextRequest, NextResponse } from 'next/server';
import { listArtifactsForRun, getWorkflowRun } from '@/services/github';
import { fetchPlaywrightResults } from '@/services/artifactFetcher';

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

    // Check if run is still in progress — no artifacts available yet
    const run = await getWorkflowRun(runId);
    if (run.status !== 'completed') {
      return NextResponse.json(
        { status: 'in_progress', message: 'Run is still in progress. Results will be available once it completes.' },
        { status: 202 },
      );
    }

    const artifactsRes = await listArtifactsForRun(runId);
    const report = await fetchPlaywrightResults(runId, artifactsRes.artifacts);

    if (!report) {
      return NextResponse.json(
        {
          error: 'No Playwright results artifact found.',
          hint: 'Make sure your workflow uploads a "playwright-results" artifact containing results.json. See README for a sample workflow.',
          artifacts: artifactsRes.artifacts.map((a) => a.name),
        },
        { status: 404 },
      );
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error('[API playwright-results]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Playwright results' },
      { status: 500 },
    );
  }
}
