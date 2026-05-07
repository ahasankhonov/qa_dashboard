/**
 * Artifact Fetcher — server-side only.
 *
 * Downloads a GitHub Actions artifact ZIP, extracts the Playwright JSON report,
 * embeds screenshots as base64, and normalizes the data for the UI.
 *
 * Flow:
 *  1. GET archive_download_url with auth → 302 redirect to S3 pre-signed URL
 *  2. GET S3 URL (no auth) → ArrayBuffer
 *  3. fflate.unzipSync → Record<filename, Uint8Array>
 *  4. Find results.json / report.json in ZIP entries
 *  5. Parse Playwright JSON report
 *  6. Walk tests, find screenshot attachments, cross-reference ZIP entries
 *  7. Embed screenshots ≤ 800 KB as base64 (total payload cap: 10 MB)
 *  8. Return NormalizedReport, cached per runId for 5 min
 */

import { unzipSync, strFromU8 } from 'fflate';
import type {
  PWReport,
  PWSuite,
  PWSpec,
  PWTest,
  PWResult,
  NormalizedReport,
  NormalizedSuite,
  NormalizedTestCase,
  NormalizedAttachment,
  TestStatus,
} from '@/types/playwright';
import type { Artifact } from '@/types/github';

// ─── In-process cache ─────────────────────────────────────────────────────────

interface CacheEntry {
  data: NormalizedReport;
  cachedAt: number;
  // Raw ZIP files keyed by normalised path — for lazy media serving
  zipFiles: Record<string, Uint8Array>;
}

const reportCache = new Map<number, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

function getCached(runId: number): CacheEntry | null {
  const entry = reportCache.get(runId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    reportCache.delete(runId);
    return null;
  }
  return entry;
}

// ─── ZIP download ─────────────────────────────────────────────────────────────

function getAuthHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  return { Authorization: `Bearer ${token}` };
}

async function downloadZip(archiveDownloadUrl: string): Promise<Record<string, Uint8Array>> {
  // Step 1 — ask GitHub for the redirect URL (manual redirect so we don't
  // forward the auth header to the S3 pre-signed URL)
  const probe = await fetch(archiveDownloadUrl, {
    headers: getAuthHeaders(),
    redirect: 'manual',
    cache: 'no-store',
  });

  // GitHub may return 302 → S3 or, for smaller artifacts, 200 directly
  let buffer: ArrayBuffer;
  if (probe.status === 302 || probe.status === 301) {
    const s3Url = probe.headers.get('location');
    if (!s3Url) throw new Error('GitHub returned redirect without Location header');
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

// ─── JSON report discovery ────────────────────────────────────────────────────

const JSON_REPORT_PATTERNS = [
  /^results\.json$/i,
  /^report\.json$/i,
  /^test-results\.json$/i,
  /\/results\.json$/i,
  /\/report\.json$/i,
];

function findReportEntry(files: Record<string, Uint8Array>): string | null {
  for (const pattern of JSON_REPORT_PATTERNS) {
    const match = Object.keys(files).find((k) => pattern.test(k));
    if (match) return match;
  }
  // Fallback: any .json file that looks like a Playwright report
  return (
    Object.keys(files).find((k) => {
      if (!k.endsWith('.json')) return false;
      try {
        const parsed = JSON.parse(strFromU8(files[k]));
        return 'suites' in parsed && 'stats' in parsed;
      } catch {
        return false;
      }
    }) ?? null
  );
}

// ─── Attachment path resolution ───────────────────────────────────────────────

/**
 * The attachment.path field in PW JSON is an absolute path on the CI runner.
 * Normalise it to a relative path that might exist in the ZIP.
 * e.g. /home/runner/work/repo/test-results/foo/screenshot.png
 *      → test-results/foo/screenshot.png
 */
function normaliseAttachmentPath(absPath: string): string {
  // Find the first path segment that matches common test output directories
  const markers = ['test-results', 'playwright-report', 'output'];
  for (const marker of markers) {
    const idx = absPath.indexOf(`/${marker}/`);
    if (idx !== -1) return absPath.slice(idx + 1); // strip leading /
    if (absPath.startsWith(`${marker}/`)) return absPath;
  }
  // Fallback: just the filename
  return absPath.split('/').pop() ?? absPath;
}

function findFileInZip(
  files: Record<string, Uint8Array>,
  attachmentPath: string,
): Uint8Array | null {
  const normalised = normaliseAttachmentPath(attachmentPath);

  // Exact match first
  if (files[normalised]) return files[normalised];

  // Try suffix match (handles different directory prefixes in ZIP)
  const filename = normalised.split('/').pop()!;
  const candidates = Object.keys(files).filter((k) => k.endsWith(normalised) || k.endsWith(filename));
  if (candidates.length === 1) return files[candidates[0]];

  return null;
}

// ─── Playwright JSON → NormalizedReport ──────────────────────────────────────

let testCounter = 0;

function pwStatusToNorm(test: PWTest, lastResult: PWResult): TestStatus {
  if (test.status === 'skipped') return 'skipped';
  if (test.status === 'flaky') return 'flaky';
  if (lastResult.status === 'timedout') return 'timedout';
  if (lastResult.status === 'passed') return 'passed';
  if (lastResult.status === 'failed') return 'failed';
  return 'failed';
}

interface EmbedContext {
  zipFiles: Record<string, Uint8Array>;
  totalBytes: { value: number };
  maxTotalBytes: number;
  maxPerImage: number;
}

function embedAttachments(
  pwResult: PWResult,
  ctx: EmbedContext,
): NormalizedAttachment[] {
  return pwResult.attachments.map((att) => {
    const norm: NormalizedAttachment = {
      name: att.name,
      contentType: att.contentType,
    };

    // Inline base64 if already embedded in JSON (rare but possible)
    if (att.body && att.contentType.startsWith('image/')) {
      const bytes = Buffer.from(att.body, 'base64').length;
      if (bytes <= ctx.maxPerImage && ctx.totalBytes.value + bytes <= ctx.maxTotalBytes) {
        norm.base64 = att.body;
        ctx.totalBytes.value += bytes;
        return norm;
      }
    }

    if (att.path) {
      const relPath = normaliseAttachmentPath(att.path);
      norm.zipPath = relPath;

      // Embed screenshot as base64 if within size limits
      if (att.contentType.startsWith('image/')) {
        const fileData = findFileInZip(ctx.zipFiles, att.path);
        if (fileData) {
          const sizeBytes = fileData.byteLength;
          if (
            sizeBytes <= ctx.maxPerImage &&
            ctx.totalBytes.value + sizeBytes <= ctx.maxTotalBytes
          ) {
            norm.base64 = Buffer.from(fileData).toString('base64');
            ctx.totalBytes.value += sizeBytes;
          }
        }
      }
    }

    return norm;
  });
}

function normaliseSpec(
  spec: PWSpec,
  suitePath: string[],
  zipFiles: Record<string, Uint8Array>,
  embedCtx: EmbedContext,
): NormalizedTestCase[] {
  return spec.tests.map((test) => {
    const lastResult = test.results[test.results.length - 1];
    const status = pwStatusToNorm(test, lastResult);
    const error = lastResult?.error ?? lastResult?.errors?.[0];

    return {
      id: `tc-${++testCounter}`,
      suitePath,
      title: spec.title,
      status,
      browser: test.projectName,
      duration: lastResult?.duration ?? 0,
      retries: test.results.length - 1,
      errorMessage: error?.message,
      errorStack: error?.stack,
      attachments: lastResult ? embedAttachments(lastResult, embedCtx) : [],
      startTime: lastResult?.startTime ?? '',
      annotations: test.annotations,
    };
  });
}

function normaliseSuite(
  suite: PWSuite,
  parentPath: string[],
  zipFiles: Record<string, Uint8Array>,
  embedCtx: EmbedContext,
): NormalizedSuite {
  const currentPath = [...parentPath, suite.title].filter(Boolean);

  const tests: NormalizedTestCase[] = suite.specs.flatMap((spec) =>
    normaliseSpec(spec, currentPath, zipFiles, embedCtx),
  );

  const children: NormalizedSuite[] = (suite.suites ?? []).map((child) =>
    normaliseSuite(child, currentPath, zipFiles, embedCtx),
  );

  return { title: suite.title, file: suite.file, tests, children };
}

function flattenSuite(suite: NormalizedSuite): NormalizedTestCase[] {
  return [
    ...suite.tests,
    ...suite.children.flatMap(flattenSuite),
  ];
}

function parsePWReport(
  raw: PWReport,
  runId: number,
  zipFiles: Record<string, Uint8Array>,
): NormalizedReport {
  testCounter = 0;
  const embedCtx: EmbedContext = {
    zipFiles,
    totalBytes: { value: 0 },
    maxTotalBytes: 10 * 1024 * 1024, // 10 MB total
    maxPerImage: 800 * 1024,          // 800 KB per image
  };

  const suites = raw.suites.map((s) => normaliseSuite(s, [], zipFiles, embedCtx));
  const allTests = suites.flatMap(flattenSuite);

  const stats = raw.stats ?? {
    startTime: new Date().toISOString(),
    duration: 0,
    expected: 0,
    unexpected: 0,
    flaky: 0,
    skipped: 0,
  };

  return {
    runId,
    startTime: stats.startTime,
    duration: stats.duration,
    stats: {
      total: allTests.length,
      passed: allTests.filter((t) => t.status === 'passed').length,
      failed: allTests.filter((t) => t.status === 'failed' || t.status === 'timedout').length,
      skipped: allTests.filter((t) => t.status === 'skipped').length,
      flaky: allTests.filter((t) => t.status === 'flaky').length,
    },
    suites,
    allTests,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Names we look for when selecting which artifact to parse */
const ARTIFACT_NAME_PATTERNS = [
  /playwright.?results?/i,
  /test.?results?/i,
  /playwright.?report/i,
  /pw.?results?/i,
];

function pickArtifact(artifacts: Artifact[]): Artifact | null {
  for (const pattern of ARTIFACT_NAME_PATTERNS) {
    const match = artifacts.find((a) => pattern.test(a.name));
    if (match && !match.expired) return match;
  }
  return null;
}

export async function fetchPlaywrightResults(
  runId: number,
  artifacts: Artifact[],
): Promise<NormalizedReport | null> {
  const cached = getCached(runId);
  if (cached) return cached.data;

  const artifact = pickArtifact(artifacts);
  if (!artifact) return null;

  const zipFiles = await downloadZip(artifact.archive_download_url);
  const reportKey = findReportEntry(zipFiles);
  if (!reportKey) return null;

  const rawJson = JSON.parse(strFromU8(zipFiles[reportKey])) as PWReport;
  const report = parsePWReport(rawJson, runId, zipFiles);

  reportCache.set(runId, { data: report, cachedAt: Date.now(), zipFiles });
  return report;
}

/** Serve a raw file from a cached artifact ZIP (for /api/media route). */
export function getMediaFromCache(runId: number, zipPath: string): Uint8Array | null {
  const cached = reportCache.get(runId);
  if (!cached) return null;
  return findFileInZip(cached.zipFiles, zipPath) ?? null;
}

/** Return only pass-rate stats if already in cache — never triggers a download. */
export function getStatsFromCache(runId: number): NormalizedReport['stats'] | null {
  const cached = getCached(runId);
  return cached ? cached.data.stats : null;
}
