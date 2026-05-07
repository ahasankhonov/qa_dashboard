/**
 * GET /api/runs/[id]/media?file=<zipPath>
 *
 * Serves a single file from a cached artifact ZIP.
 * Useful for lazy-loading large screenshots or trace links that were not
 * embedded inline in the playwright-results response.
 *
 * The cache must already be warm (populated by /playwright-results first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediaFromCache } from '@/services/artifactFetcher';

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  webm: 'video/webm',
  mp4: 'video/mp4',
  zip: 'application/zip',
  json: 'application/json',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runId = Number(id);
  if (isNaN(runId)) {
    return NextResponse.json({ error: 'Invalid run ID' }, { status: 400 });
  }

  const file = req.nextUrl.searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'Missing file query parameter' }, { status: 400 });
  }

  const data = getMediaFromCache(runId, file);
  if (!data) {
    return NextResponse.json(
      { error: 'File not found in cache. Load playwright-results first.' },
      { status: 404 },
    );
  }

  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

  return new NextResponse(data.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
