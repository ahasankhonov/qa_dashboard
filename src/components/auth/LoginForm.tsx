'use client';

import { useState, useRef } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

export function LoginForm() {
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.ok) {
      setError(result.message ?? 'Login failed.');
      setPassword('');
      triggerShake();
      passwordRef.current?.focus();
    }

    setIsLoading(false);
  };

  return (
    <div
      className={cn(
        'w-full max-w-md',
        shake && 'animate-shake',
      )}
    >
      {/* Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-zinc-100 leading-tight">QA Dashboard</p>
              <p className="text-xs text-zinc-500">v1.0.0</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-zinc-100">Sign in to your account</h1>
          <p className="text-sm text-zinc-500 mt-1">
            BolderApps QA automation dashboard for QuickTicketAI project
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              className={cn(
                'w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-950 border text-zinc-100 placeholder-zinc-600',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all',
                error ? 'border-red-500/40' : 'border-zinc-800 focus:border-indigo-500/60',
              )}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-zinc-400 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className={cn(
                  'w-full px-4 py-2.5 pr-11 rounded-xl text-sm bg-zinc-950 border text-zinc-100 placeholder-zinc-600',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all',
                  error ? 'border-red-500/40' : 'border-zinc-800 focus:border-indigo-500/60',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all',
              'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              'shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600',
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-zinc-950/50 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-600 text-center">
            Demo environment — session expires when browser closes
          </p>
        </div>
      </div>
    </div>
  );
}
