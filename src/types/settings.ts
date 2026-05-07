export interface AppSettings {
  githubOwner: string;
  githubRepo: string;
  adminWorkflowId: string;
  managerWorkflowId: string;
  technicianWorkflowId: string;
  branch: string;
  pollingInterval: number; // seconds
}

export const DEFAULT_SETTINGS: AppSettings = {
  githubOwner: process.env.NEXT_PUBLIC_GITHUB_OWNER || '',
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO || '',
  adminWorkflowId: process.env.NEXT_PUBLIC_ADMIN_WORKFLOW_ID || '',
  managerWorkflowId: process.env.NEXT_PUBLIC_MANAGER_WORKFLOW_ID || '',
  technicianWorkflowId: process.env.NEXT_PUBLIC_TECHNICIAN_WORKFLOW_ID || '',
  branch: 'main',
  pollingInterval: 10,
};
