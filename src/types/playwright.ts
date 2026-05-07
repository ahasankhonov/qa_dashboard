// ─── Raw Playwright JSON reporter output ─────────────────────────────────────
// Shape produced by: npx playwright test --reporter=json

export interface PWReport {
  config: PWConfig;
  suites: PWSuite[];
  errors: PWError[];
  stats: PWStats;
}

export interface PWConfig {
  configFile?: string;
  rootDir?: string;
  projects: Array<{ name: string; id?: string }>;
}

export interface PWStats {
  startTime: string;
  duration: number;
  expected: number;   // passed
  unexpected: number; // failed
  flaky: number;
  skipped: number;
}

export interface PWSuite {
  title: string;
  file: string;
  line?: number;
  column?: number;
  specs: PWSpec[];
  suites?: PWSuite[];
}

export interface PWSpec {
  title: string;
  ok: boolean;
  tags: string[];
  tests: PWTest[];
  id?: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface PWTest {
  timeout: number;
  annotations: Array<{ type: string; description?: string }>;
  expectedStatus: 'passed' | 'failed' | 'skipped';
  projectId?: string;
  projectName: string;
  results: PWResult[];
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
}

export interface PWResult {
  workerIndex: number;
  status: 'passed' | 'failed' | 'timedout' | 'skipped' | 'interrupted';
  duration: number;
  error?: PWError;
  errors: PWError[];
  stdout: Array<{ text?: string; buffer?: string }>;
  stderr: Array<{ text?: string; buffer?: string }>;
  retry: number;
  startTime: string;
  attachments: PWAttachment[];
}

export interface PWAttachment {
  name: string;
  contentType: string;
  path?: string;
  body?: string; // base64 — only present when embedded in JSON
}

export interface PWError {
  message?: string;
  stack?: string;
  value?: string;
  location?: { file: string; line: number; column: number };
}

// ─── Normalized types consumed by UI components ───────────────────────────────

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'flaky' | 'timedout';

export interface NormalizedAttachment {
  name: string;
  contentType: string;
  /** base64-encoded image data for inline display (screenshots only, capped at 800 KB) */
  base64?: string;
  /** Original filename in the artifact ZIP, used for the /api/runs/[id]/media route */
  zipPath?: string;
}

export interface NormalizedTestCase {
  id: string;
  /** Full path: ['Suite file', 'describe block', ...] */
  suitePath: string[];
  title: string;
  status: TestStatus;
  browser: string;
  duration: number; // ms — last result
  retries: number;
  errorMessage?: string;
  errorStack?: string;
  attachments: NormalizedAttachment[];
  startTime: string;
  annotations: Array<{ type: string; description?: string }>;
}

export interface NormalizedSuite {
  title: string;
  file: string;
  tests: NormalizedTestCase[];
  /** Nested suites (describe blocks inside a file) */
  children: NormalizedSuite[];
}

export interface NormalizedReport {
  runId: number;
  startTime: string;
  duration: number;
  stats: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  suites: NormalizedSuite[];
  /** Flat list for easy filtering */
  allTests: NormalizedTestCase[];
}
