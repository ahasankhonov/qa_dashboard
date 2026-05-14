/**
 * GitHub REST API service — server-side only.
 *
 * All requests are authenticated with GITHUB_TOKEN from env vars.
 * This file must NEVER be imported from client components.
 * Use API routes (/api/*) to proxy these calls to the browser.
 *
 * Supports two repo contexts:
 *   - Default (Playwright): GITHUB_OWNER / GITHUB_REPO / GITHUB_TOKEN
 *   - Flutter (Mobile):     GITHUB_FLUTTER_OWNER / GITHUB_FLUTTER_REPO / GITHUB_TOKEN
 */

import type {
  WorkflowRun,
  WorkflowRunsResponse,
  WorkflowJobsResponse,
  ArtifactsResponse,
  WorkflowsResponse,
  TriggerWorkflowPayload,
} from '@/types/github';

const GITHUB_API = 'https://api.github.com';

// ─── Shared error handler ─────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('GitHub token is invalid or expired. Check your GITHUB_TOKEN environment variable.');
    }
    if (res.status === 403) {
      const remaining = res.headers.get('X-RateLimit-Remaining');
      const reset = res.headers.get('X-RateLimit-Reset');
      if (remaining === '0' && reset) {
        const resetTime = new Date(Number(reset) * 1000).toLocaleTimeString();
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}.`);
      }
      throw new Error('GitHub API access forbidden. Verify your token has the required scopes (repo, actions:read).');
    }
    if (res.status === 404) {
      throw new Error('Repository or resource not found. Check your GITHUB_OWNER and GITHUB_REPO settings.');
    }
    if (res.status === 422) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(`GitHub API validation error: ${body.message ?? 'invalid request'}`);
    }
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Generic fetch (token + path) ────────────────────────────────────────────

async function apiRequest<T>(token: string, path: string, options?: RequestInit): Promise<T> {
  const url = `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });
  return handleResponse<T>(res);
}

// ─── Playwright repo config ───────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is not set');
  return token;
}

function getConfig(): { owner: string; repo: string } {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) throw new Error('GITHUB_OWNER or GITHUB_REPO environment variables are not set');
  return { owner, repo };
}

function githubFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(getToken(), path, options);
}

// ─── Flutter repo config ──────────────────────────────────────────────────────

export function getFlutterToken(): string {
  return process.env.GITHUB_FLUTTER_TOKEN || process.env.GITHUB_TOKEN || '';
}

function getFlutterConfig(): { owner: string; repo: string } {
  const owner = process.env.GITHUB_FLUTTER_OWNER;
  const repo = process.env.GITHUB_FLUTTER_REPO;
  if (!owner || !repo) throw new Error('GITHUB_FLUTTER_OWNER or GITHUB_FLUTTER_REPO environment variables are not set');
  return { owner, repo };
}

function flutterFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return apiRequest<T>(getFlutterToken(), path, options);
}

// ─── Playwright: Workflows ────────────────────────────────────────────────────

export async function listWorkflows(): Promise<WorkflowsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowsResponse>(`/repos/${owner}/${repo}/actions/workflows`);
}

// ─── Playwright: Workflow Runs ────────────────────────────────────────────────

export async function listWorkflowRuns(
  workflowId?: string | number,
  perPage = 30,
  page = 1,
): Promise<WorkflowRunsResponse> {
  const { owner, repo } = getConfig();
  const base = workflowId
    ? `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`
    : `/repos/${owner}/${repo}/actions/runs`;
  return githubFetch<WorkflowRunsResponse>(`${base}?per_page=${perPage}&page=${page}`);
}

export async function getWorkflowRun(runId: number): Promise<WorkflowRun> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowRun>(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

// ─── Playwright: Trigger ──────────────────────────────────────────────────────

export async function triggerWorkflow(
  workflowId: string,
  payload: TriggerWorkflowPayload,
): Promise<void> {
  const { owner, repo } = getConfig();
  await githubFetch<undefined>(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

// ─── Playwright: Jobs ─────────────────────────────────────────────────────────

export async function listJobsForRun(runId: number): Promise<WorkflowJobsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowJobsResponse>(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
}

// ─── Playwright: Artifacts ────────────────────────────────────────────────────

export async function listArtifactsForRun(runId: number): Promise<ArtifactsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<ArtifactsResponse>(`/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`);
}

// ─── Flutter: Workflows list ─────────────────────────────────────────────────

export async function listFlutterWorkflows(): Promise<WorkflowsResponse> {
  const { owner, repo } = getFlutterConfig();
  return flutterFetch<WorkflowsResponse>(`/repos/${owner}/${repo}/actions/workflows`);
}

// Cached numeric workflow ID — resolved once per process lifetime
let _flutterWorkflowNumericId: number | null = null;

async function resolveFlutterWorkflowNumericId(): Promise<number | null> {
  if (_flutterWorkflowNumericId) return _flutterWorkflowNumericId;
  try {
    const { workflows } = await listFlutterWorkflows();
    const fileId = process.env.GITHUB_FLUTTER_WORKFLOW_ID ?? '';
    const match = workflows.find(
      (w) =>
        w.path.endsWith(`/${fileId}`) ||
        w.path.endsWith(`/${fileId.replace('.yaml', '.yml')}`) ||
        w.path.endsWith(`/${fileId.replace('.yml', '.yaml')}`) ||
        w.name.toLowerCase().includes('flutter'),
    );
    if (match) _flutterWorkflowNumericId = match.id;
    return _flutterWorkflowNumericId;
  } catch {
    return null;
  }
}

// ─── Flutter: Workflow Runs ───────────────────────────────────────────────────

export async function listFlutterWorkflowRuns(
  perPage = 30,
  page = 1,
): Promise<WorkflowRunsResponse> {
  const { owner, repo } = getFlutterConfig();

  // Prefer the resolved numeric ID — immune to .yml vs .yaml mismatch
  const numericId = await resolveFlutterWorkflowNumericId();
  if (numericId) {
    return flutterFetch<WorkflowRunsResponse>(
      `/repos/${owner}/${repo}/actions/workflows/${numericId}/runs?per_page=${perPage}&page=${page}`,
    );
  }

  // Fallback: list all runs for the repo (Flutter repo has only one workflow)
  return flutterFetch<WorkflowRunsResponse>(
    `/repos/${owner}/${repo}/actions/runs?per_page=${perPage}&page=${page}`,
  );
}

export async function getFlutterWorkflowRun(runId: number): Promise<WorkflowRun> {
  const { owner, repo } = getFlutterConfig();
  return flutterFetch<WorkflowRun>(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

// ─── Flutter: Trigger ─────────────────────────────────────────────────────────

export async function triggerFlutterWorkflow(payload: TriggerWorkflowPayload): Promise<void> {
  const { owner, repo } = getFlutterConfig();
  const workflowId = process.env.GITHUB_FLUTTER_WORKFLOW_ID;
  if (!workflowId) throw new Error('GITHUB_FLUTTER_WORKFLOW_ID is not set');
  await flutterFetch<undefined>(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

// ─── Flutter: Jobs ────────────────────────────────────────────────────────────

export async function listFlutterJobsForRun(runId: number): Promise<WorkflowJobsResponse> {
  const { owner, repo } = getFlutterConfig();
  return flutterFetch<WorkflowJobsResponse>(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
}

// ─── Flutter: Artifacts ───────────────────────────────────────────────────────

export async function listFlutterArtifactsForRun(runId: number): Promise<ArtifactsResponse> {
  const { owner, repo } = getFlutterConfig();
  return flutterFetch<ArtifactsResponse>(`/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`);
}
