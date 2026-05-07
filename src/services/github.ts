/**
 * GitHub REST API service — server-side only.
 *
 * All requests are authenticated with GITHUB_TOKEN from env vars.
 * This file must NEVER be imported from client components.
 * Use API routes (/api/*) to proxy these calls to the browser.
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

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function getConfig(): { owner: string; repo: string } {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    throw new Error('GITHUB_OWNER or GITHUB_REPO environment variables are not set');
  }
  return { owner, repo };
}

async function githubFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options?.headers || {}),
    },
    // Disable Next.js cache so we always get fresh data
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  // 204 No Content (e.g. workflow_dispatch returns this)
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Workflows ───────────────────────────────────────────────────────────────

export async function listWorkflows(): Promise<WorkflowsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowsResponse>(`/repos/${owner}/${repo}/actions/workflows`);
}

// ─── Workflow Runs ────────────────────────────────────────────────────────────

export async function listWorkflowRuns(
  workflowId?: string | number,
  perPage = 30,
  page = 1,
): Promise<WorkflowRunsResponse> {
  const { owner, repo } = getConfig();
  const base = workflowId
    ? `/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs`
    : `/repos/${owner}/${repo}/actions/runs`;

  return githubFetch<WorkflowRunsResponse>(
    `${base}?per_page=${perPage}&page=${page}`,
  );
}

export async function getWorkflowRun(runId: number): Promise<WorkflowRun> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowRun>(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

/**
 * Triggers a workflow_dispatch event on a given workflow.
 * Returns undefined (GitHub sends 204 No Content on success).
 */
export async function triggerWorkflow(
  workflowId: string,
  payload: TriggerWorkflowPayload,
): Promise<void> {
  const { owner, repo } = getConfig();
  await githubFetch<undefined>(
    `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function listJobsForRun(runId: number): Promise<WorkflowJobsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<WorkflowJobsResponse>(
    `/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
  );
}

// ─── Artifacts ───────────────────────────────────────────────────────────────

export async function listArtifactsForRun(runId: number): Promise<ArtifactsResponse> {
  const { owner, repo } = getConfig();
  return githubFetch<ArtifactsResponse>(
    `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute duration in milliseconds between two ISO date strings. */
export function computeDuration(startedAt: string, completedAt: string | null): number | null {
  if (!completedAt) return null;
  return new Date(completedAt).getTime() - new Date(startedAt).getTime();
}
