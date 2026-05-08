/**
 * GET /api/runs/[id]/playwright-results/stream
 *
 * SSE endpoint that streams artifact download progress to the client,
 * then sends the parsed Playwright report as the final event.
 *
 * Events:
 *   { type: 'start' }
 *   { type: 'progress', loaded: number, total: number }
 *   { type: 'in_progress' }
 *   { type: 'no_artifact', artifacts: string[] }
 *   { type: 'done', report: NormalizedReport }
 *   { type: 'error', message: string }
 */

import { NextRequest } from 'next/server';
import { listArtifactsForRun, getWorkflowRun } from '@/services/github';
import { fetchPlaywrightResults } from '@/services/artifactFetcher';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const runId = Number(id);

  if (isNaN(runId)) {
    return new Response('Invalid run ID', { status: 400 });
  }

  const encoder = new TextEncoder();

  function sse(data: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const run = await getWorkflowRun(runId);
        if (run.status !== 'completed') {
          controller.enqueue(sse({ type: 'in_progress' }));
          controller.close();
          return;
        }

        const artifactsRes = await listArtifactsForRun(runId);

        controller.enqueue(sse({ type: 'start' }));

        const report = await fetchPlaywrightResults(
          runId,
          artifactsRes.artifacts,
          (loaded, total) => {
            controller.enqueue(sse({ type: 'progress', loaded, total }));
          },
        );

        if (!report) {
          controller.enqueue(
            sse({
              type: 'no_artifact',
              artifacts: artifactsRes.artifacts.map((a) => a.name),
            }),
          );
          controller.close();
          return;
        }

        controller.enqueue(sse({ type: 'done', report }));
        controller.close();
      } catch (err) {
        console.error('[API playwright-results/stream]', err);
        controller.enqueue(
          sse({ type: 'error', message: err instanceof Error ? err.message : 'Failed to fetch results' }),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
