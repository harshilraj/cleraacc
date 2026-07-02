'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center gap-2 mb-2"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="7" fill="var(--accent)" />
              <path
                d="M8 14h4m0 0l-2-3m2 3l-2 3M16 10v8m3-6l-3 6m0-6l3 6"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Content Studio
            </span>
          </div>
          <p className="text-ink-subtle text-sm">Your personal writing workspace</p>
        </div>

        {/* Card */}
        <div
          className="bg-surface rounded-xl p-8"
          style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--mist)' }}
        >
          <h1 className="text-base font-semibold text-ink mb-6">Sign in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="username" className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-ink text-sm bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  borderColor: 'var(--mist-strong)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
                placeholder="username"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-medium text-ink-muted uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-ink text-sm bg-canvas placeholder:text-ink-subtle focus:outline-none focus:ring-2 transition-shadow"
                style={{
                  borderColor: 'var(--mist-strong)',
                  '--tw-ring-color': 'var(--accent)',
                } as React.CSSProperties}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: loading ? 'var(--ink-subtle)' : 'var(--accent)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
