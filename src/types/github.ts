// GitHub API types for workflow runs, artifacts, and jobs

export type WorkflowRunStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'waiting'
  | 'requested'
  | 'pending';

export type WorkflowRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | null;

export interface WorkflowRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  run_number: number;
  event: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  workflow_id: number;
  created_at: string;
  updated_at: string;
  run_started_at: string;
  html_url: string;
  jobs_url: string;
  logs_url: string;
  artifacts_url: string;
  actor: {
    login: string;
    avatar_url: string;
  };
  triggering_actor: {
    login: string;
    avatar_url: string;
  };
}

export interface WorkflowRunsResponse {
  total_count: number;
  workflow_runs: WorkflowRun[];
}

export interface WorkflowJob {
  id: number;
  run_id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  started_at: string;
  completed_at: string;
  steps: WorkflowStep[];
  html_url: string;
}

export interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string;
  completed_at: string;
}

export interface WorkflowJobsResponse {
  total_count: number;
  jobs: WorkflowJob[];
}

export interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string;
  updated_at: string;
}

export interface ArtifactsResponse {
  total_count: number;
  artifacts: Artifact[];
}

export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: string;
  created_at: string;
  updated_at: string;
  html_url: string;
  badge_url: string;
}

export interface WorkflowsResponse {
  total_count: number;
  workflows: Workflow[];
}

export interface TriggerWorkflowPayload {
  ref: string;
  inputs?: Record<string, string>;
}
