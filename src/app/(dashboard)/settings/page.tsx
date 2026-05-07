'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  GitBranch,
  RefreshCw,
  Workflow,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { loadSettings, saveSettings } from '@/lib/settings';
import type { AppSettings } from '@/types/settings';

interface FieldProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function Field({ label, description, children }: FieldProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4 border-b border-zinc-800 last:border-0">
      <div className="sm:col-span-1">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  monospace = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  monospace?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors ${
        monospace ? 'font-mono' : ''
      }`}
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="w-32 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
    />
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    githubOwner: '',
    githubRepo: '',
    adminWorkflowId: '',
    managerWorkflowId: '',
    technicianWorkflowId: '',
    branch: 'main',
    pollingInterval: 10,
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    const stored = loadSettings();
    setSettings(stored);
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setIsSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus('ok');
        toast.success(`Connected! Found ${data.total_count} workflow(s).`);
      } else {
        const err = await res.json();
        setConnectionStatus('error');
        toast.error(`Connection failed: ${err.error || res.statusText}`);
      }
    } catch (err) {
      setConnectionStatus('error');
      toast.error('Connection failed — check console for details');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const update = (key: keyof AppSettings) => (value: string | number) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <Header
        title="Settings"
        subtitle="Configure your GitHub repository and workflow connections"
      />

      <div className="max-w-3xl space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-0.5">Environment Variables vs Local Settings</p>
            <p className="text-xs text-blue-400">
              For production, set your GitHub credentials as environment variables (
              <code className="font-mono text-xs bg-blue-500/20 px-1 rounded">GITHUB_TOKEN</code>,{' '}
              <code className="font-mono text-xs bg-blue-500/20 px-1 rounded">GITHUB_OWNER</code>,
              etc.). Settings saved here are stored in browser localStorage and used as overrides
              in development.
            </p>
          </div>
        </div>

        {/* Repository Settings */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Repository</h2>
          </div>

          <Field label="GitHub Owner" description="Your GitHub username or organisation">
            <TextInput
              value={settings.githubOwner}
              onChange={update('githubOwner')}
              placeholder="e.g. my-org"
            />
          </Field>

          <Field label="Repository Name" description="Name of the Playwright automation repo">
            <TextInput
              value={settings.githubRepo}
              onChange={update('githubRepo')}
              placeholder="e.g. playwright-tests"
            />
          </Field>

          <Field label="Default Branch" description="Branch used when triggering workflows">
            <TextInput
              value={settings.branch}
              onChange={update('branch')}
              placeholder="main"
              monospace
            />
          </Field>
        </div>

        {/* Workflow IDs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Workflow className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Workflow IDs</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-6">
            Enter the workflow filename (e.g.{' '}
            <code className="font-mono text-xs bg-zinc-800 px-1 rounded">
              playwright-admin.yml
            </code>
            ) or numeric ID. Find these in your repo under{' '}
            <code className="font-mono text-xs bg-zinc-800 px-1 rounded">
              .github/workflows/
            </code>
            .
          </p>

          <Field
            label="Admin Workflow ID"
            description="Workflow for admin role tests"
          >
            <TextInput
              value={settings.adminWorkflowId}
              onChange={update('adminWorkflowId')}
              placeholder="e.g. playwright-admin.yml"
              monospace
            />
          </Field>

          <Field
            label="Manager Workflow ID"
            description="Workflow for manager role tests"
          >
            <TextInput
              value={settings.managerWorkflowId}
              onChange={update('managerWorkflowId')}
              placeholder="e.g. playwright-manager.yml"
              monospace
            />
          </Field>

          <Field
            label="Technician Workflow ID"
            description="Workflow for technician role tests"
          >
            <TextInput
              value={settings.technicianWorkflowId}
              onChange={update('technicianWorkflowId')}
              placeholder="e.g. playwright-technician.yml"
              monospace
            />
          </Field>
        </div>

        {/* Polling */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Polling</h2>
          </div>

          <Field
            label="Polling Interval"
            description="How often to check run status when a run is in progress (seconds)"
          >
            <div className="flex items-center gap-3">
              <NumberInput
                value={settings.pollingInterval}
                onChange={update('pollingInterval')}
                min={5}
                max={300}
              />
              <span className="text-sm text-zinc-500">seconds</span>
            </div>
          </Field>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            leftIcon={isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            className={isSaved ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' : ''}
          >
            {isSaved ? 'Saved!' : 'Save Settings'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleTestConnection}
            isLoading={isTestingConnection}
            leftIcon={
              connectionStatus === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : connectionStatus === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Settings className="w-4 h-4" />
              )
            }
          >
            Test Connection
          </Button>
        </div>
      </div>
    </div>
  );
}
