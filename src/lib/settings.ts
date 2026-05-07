'use client';

import type { AppSettings } from '@/types/settings';

const STORAGE_KEY = 'qa_dashboard_settings';

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return getDefaultSettings();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getDefaultSettings(): AppSettings {
  return {
    githubOwner: '',
    githubRepo: '',
    adminWorkflowId: '',
    managerWorkflowId: '',
    technicianWorkflowId: '',
    branch: 'main',
    pollingInterval: 10,
  };
}
