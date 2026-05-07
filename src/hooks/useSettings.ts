'use client';

import { useState, useEffect } from 'react';
import type { AppSettings } from '@/types/settings';
import { loadSettings, saveSettings } from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSettings = (updated: AppSettings) => {
    saveSettings(updated);
    setSettings(updated);
  };

  return { settings, updateSettings };
}
