/**
 * POST /api/flutter/trigger
 *
 * Triggers the Flutter CI workflow_dispatch event.
 * Resolves the workflow by listing all workflows in the Flutter repo and
 * matching by file name OR display name — so the env var extension (.yml vs
 * .yaml) and casing don't matter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listFlutterWorkflows, listFlutterWorkflowRuns, getFlutterToken } from '@/services/github';

const GITHUB_API = 'https://api.github.com';

async function resolveFlutterWorkflowId(): Promise<number | string> {
  const configuredId = process.env.GITHUB_FLUTTER_WORKFLOW_ID ?? 'flutter_ci.yaml';

  try {
    const { workflows } = await listFlutterWorkflows();

    // 1. Try exact file name match (handles .yml vs .yaml)
    const byFile = workflows.find(
      (w) =>
        w.path.endsWith(`/${configuredId}`) ||
        w.path.endsWith(`/${configuredId.replace('.yaml', '.yml')}`) ||
        w.path.endsWith(`/${configuredId.replace('.yml', '.yaml')}`),
    );
    if (byFile) return byFile.id;

    // 2. Try display name match — "Flutter CI"
    const byName = workflows.find((w) =>
      w.name.toLowerCase().includes('flutter'),
    );
    if (byName) return byName.id;
  } catch {
    // Fall back to using the configured string ID directly
  }

  return configuredId;
}

async function triggerWorkflowDispatch(
  workflowId: number | string,
  ref: string,
  inputs?: Record<string, string>,
): Promise<Response> {
  const owner = process.env.GITHUB_FLUTTER_OWNER;
  const repo = process.env.GITHUB_FLUTTER_REPO;
  const token = getFlutterToken();

  return fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref, inputs }),
      cache: 'no-store',
    },
  );
}

async function getLatestFlutterRunId(): Promise<number | undefined> {
  await new Promise((r) => setTimeout(r, 2500));
  const runs = await listFlutterWorkflowRuns(5, 1);
  const latest = runs.workflow_runs.find(
    (r) => r.status === 'queued' || r.status === 'in_progress' || r.status === 'waiting',
  ) ?? runs.workflow_runs[0];
  return latest?.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      branch?: string;
      inputs?: Record<string, string>;
    };

    const ref = body.branch || process.env.GITHUB_FLUTTER_DEFAULT_BRANCH || 'main';
    const workflowId = await resolveFlutterWorkflowId();

    const res = await triggerWorkflowDispatch(workflowId, ref, body.inputs);

    if (!res.ok && res.status !== 204) {
      if (res.status === 401) {
        throw new Error(
          'Flutter GitHub token is invalid or expired. Set GITHUB_FLUTTER_TOKEN in .env.local.',
        );
      }
      if (res.status === 403) {
        throw new Error(
          'Access forbidden. Your GITHUB_TOKEN needs write access to the Flutter repo. Set GITHUB_FLUTTER_TOKEN with a token that has repo + workflow scopes for sunnatamir/quick-ticket-ai.',
        );
      }
      if (res.status === 404) {
        throw new Error(
          `Flutter workflow not found (tried ID: ${workflowId}). Check GITHUB_FLUTTER_OWNER="${process.env.GITHUB_FLUTTER_OWNER}", GITHUB_FLUTTER_REPO="${process.env.GITHUB_FLUTTER_REPO}", and ensure the workflow has "on: workflow_dispatch:" configured.`,
        );
      }
      const body2 = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${body2}`);
    }

    let runId: number | undefined;
    try {
      runId = await getLatestFlutterRunId();
    } catch {
      // Non-critical
    }

    return NextResponse.json({ success: true, runId });
  } catch (error) {
    console.error('[API /flutter/trigger]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger Flutter workflow' },
      { status: 500 },
    );
  }
}
