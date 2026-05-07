/**
 * GET /api/runs/[id]/pass-rate
 *
 * Returns pass-rate stats from the in-process report cache ONLY.
 * Never triggers a ZIP download — responds in < 5 ms when cache is warm.
 * Returns 204 (No Content) when the cache is cold so the badge can show "—".
 *
 * The cache is warmed the first time a user visits /runs/[id]/results.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStatsFromCache } from '@/services/artifactFetcher';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runId = Number(id);
  if (isNaN(runId)) {
    return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
  }

  const stats = getStatsFromCache(runId);
  if (!stats) {
    return new NextResponse(null, { status: 204 }); // cache cold — badge shows "—"
  }

  const passRate = stats.total > 0
    ? Math.round((stats.passed / stats.total) * 100)
    : null;

  return NextResponse.json({ passRate, ...stats });
}
