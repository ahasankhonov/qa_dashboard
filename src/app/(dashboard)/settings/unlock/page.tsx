'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, LayoutDashboard, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const DEV_PASSWORD = 'Qwerty123!';

export default function SettingsUnlockPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEV_PASSWORD) {
      router.push('/settings');
    } else {
      setError('Incorrect password.');
      setPassword('');
      triggerShake();
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className={cn('w-full max-w-sm', shake && 'animate-shake')}>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-zinc-800 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-2">
              Only for devs
            </p>
            <h1 className="text-lg font-bold text-zinc-100">Settings access</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Enter the developer password to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="dev-password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="dev-password"
                  ref={inputRef}
                  type={showPw ? 'text' : 'password'}
                  autoComplete="off"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={cn(
                    'w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-zinc-950 border text-zinc-100 placeholder-zinc-600',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all',
                    error ? 'border-red-500/40' : 'border-zinc-800 focus:border-amber-500/50',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!password}
              className={cn(
                'w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all',
                'bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-400',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                'shadow-lg shadow-amber-500/20',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500',
              )}
            >
              Unlock Settings
            </button>
          </form>

          {/* Nav buttons */}
          <div className="px-8 pb-6 space-y-2">
            <p className="text-xs text-zinc-600 text-center mb-3">or navigate to</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/60 transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => router.push('/reports')}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/60 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Reports
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
