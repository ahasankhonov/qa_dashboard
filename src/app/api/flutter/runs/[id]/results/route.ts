import { NextRequest, NextResponse } from 'next/server';
import { listFlutterArtifactsForRun, getFlutterWorkflowRun, getFlutterToken } from '@/services/github';
import { unzipSync, strFromU8 } from 'fflate';
import type { Artifact } from '@/types/github';

async function downloadZip(archiveDownloadUrl: string): Promise<Record<string, Uint8Array>> {
  const token = getFlutterToken();
  const probe = await fetch(archiveDownloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
    cache: 'no-store',
  });

  let buffer: ArrayBuffer;
  if (probe.status === 302 || probe.status === 301) {
    const s3Url = probe.headers.get('location');
    if (!s3Url) throw new Error('GitHub redirect missing Location header');
    const s3Res = await fetch(s3Url, { cache: 'no-store' });
    if (!s3Res.ok) throw new Error(`S3 download failed: ${s3Res.status}`);
    buffer = await s3Res.arrayBuffer();
  } else if (probe.status === 200) {
    buffer = await probe.arrayBuffer();
  } else {
    const body = await probe.text();
    throw new Error(`Artifact download failed (${probe.status}): ${body}`);
  }
  return unzipSync(new Uint8Array(buffer));
}

function pickDiagnosticsArtifact(artifacts: Artifact[]): Artifact | null {
  // Prefer ci-diagnostics, fall back to any artifact with test-results in name
  return (
    artifacts.find((a) => !a.expired && /ci.?diagnostics/i.test(a.name)) ??
    artifacts.find((a) => !a.expired && /test.?results?/i.test(a.name)) ??
    artifacts.find((a) => !a.expired) ??
    null
  );
}

// ─── Flutter NDJSON test event types ────────────────────────────────────────

interface FlutterEvent {
  type: string;
  time: number;
  test?: { id: number; name: string };
  testID?: number;
  result?: 'success' | 'failure' | 'error';
  skipped?: boolean;
  error?: string;
  stackTrace?: string;
  message?: string;
  isFailure?: boolean;
  success?: boolean;
}

export interface FlutterTestCase {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
}

export interface FlutterTestResults {
  runId: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  success: boolean;
  tests: FlutterTestCase[];
}

function parseNDJSON(content: string): FlutterTestCase[] {
  const lines = content.trim().split('\n').filter((l) => l.trim());
  const events: FlutterEvent[] = [];
  for (const line of lines) {
    try { events.push(JSON.parse(line) as FlutterEvent); } catch { /* skip */ }
  }

  const testMap = new Map<number, { name: string; startTime: number }>();
  const errorMap = new Map<number, string[]>();
  const stackMap = new Map<number, string>();
  const tests: FlutterTestCase[] = [];

  for (const event of events) {
    if (event.type === 'testStart' && event.test) {
      testMap.set(event.test.id, { name: event.test.name, startTime: event.time });
    }
    if ((event.type === 'error' || event.type === 'print') && event.testID !== undefined) {
      const msg = event.error ?? event.message ?? '';
      if (msg) {
        const existing = errorMap.get(event.testID) ?? [];
        existing.push(msg);
        errorMap.set(event.testID, existing);
      }
      if (event.stackTrace) stackMap.set(event.testID, event.stackTrace);
    }
    if (event.type === 'testDone' && event.testID !== undefined) {
      const info = testMap.get(event.testID);
      // Skip synthetic "loading …" tests
      if (info && !info.name.startsWith('loading ')) {
        tests.push({
          id: String(event.testID),
          name: info.name,
          status: event.skipped
            ? 'skipped'
            : event.result === 'success'
            ? 'passed'
            : 'failed',
          duration: event.time - info.startTime,
          errorMessage: errorMap.get(event.testID)?.join('\n') || undefined,
          stackTrace: stackMap.get(event.testID),
        });
      }
    }
  }
  return tests;
}

function parsePlainJSON(content: string): FlutterTestCase[] {
  const parsed = JSON.parse(content) as unknown;
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).tests && Array.isArray((parsed as Record<string, unknown[]>).tests)
    ? (parsed as { tests: unknown[] }).tests
    : [];

  return (arr as Record<string, unknown>[]).map((t, i) => ({
    id: String(i),
    name: String(t.name ?? t.testName ?? `Test ${i + 1}`),
    status:
      t.status === 'passed' || t.result === 'success'
        ? 'passed'
        : t.status === 'skipped'
        ? 'skipped'
        : 'failed',
    duration: Number(t.duration ?? 0),
    errorMessage: t.error != null ? String(t.error) : t.errorMessage != null ? String(t.errorMessage) : undefined,
  }));
}

function parseTestResults(content: string): FlutterTestCase[] {
  const trimmed = content.trim();
  // Detect NDJSON by looking for multiple JSON objects separated by newlines
  const firstLine = trimmed.split('\n')[0]?.trim() ?? '';
  if (firstLine.startsWith('{') && firstLine.includes('"type"')) {
    return parseNDJSON(trimmed);
  }
  // Try plain JSON
  try {
    return parsePlainJSON(trimmed);
  } catch {
    // Last resort: try NDJSON anyway
    return parseNDJSON(trimmed);
  }
}

// ─── Route handler ──────────────────────────────────────────────────────────

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

    // Fetch run status and artifacts in parallel
    const [run, { artifacts }] = await Promise.all([
      getFlutterWorkflowRun(runId),
      listFlutterArtifactsForRun(runId),
    ]);
    if (run.status !== 'completed') {
      return NextResponse.json({ status: 'in_progress' }, { status: 202 });
    }
    const artifact = pickDiagnosticsArtifact(artifacts);

    if (!artifact) {
      return NextResponse.json(
        { error: 'No diagnostics artifact found for this run', artifacts: artifacts.map((a) => a.name) },
        { status: 404 },
      );
    }

    const zipFiles = await downloadZip(artifact.archive_download_url);

    // Find test-results.json in the ZIP
    const resultKey = Object.keys(zipFiles).find((k) =>
      /test[-_]results\.json$/i.test(k) || /results\.json$/i.test(k),
    );

    if (!resultKey) {
      return NextResponse.json(
        { error: 'test-results.json not found in artifact', files: Object.keys(zipFiles) },
        { status: 404 },
      );
    }

    const content = strFromU8(zipFiles[resultKey]);
    const tests = parseTestResults(content);

    const passed = tests.filter((t) => t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    const skipped = tests.filter((t) => t.status === 'skipped').length;

    const result: FlutterTestResults = {
      runId,
      total: tests.length,
      passed,
      failed,
      skipped,
      success: failed === 0 && tests.length > 0,
      tests,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /flutter/runs/[id]/results]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Flutter results' },
      { status: 500 },
    );
  }
}
