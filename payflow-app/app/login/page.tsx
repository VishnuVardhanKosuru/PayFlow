'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';

// Inner component — uses useSearchParams so MUST be inside <Suspense>
function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState('');
  const [error, setError]       = useState('');

  const supabase     = createClient();
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Show errors passed via URL (e.g. expired confirmation link)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(decodeURIComponent(urlError));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // After clicking the confirmation email, Supabase sends the user here.
            // This route exchanges the one-time code for a real session.
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage('Account created! Check your email to confirm, then log in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">PayFlow</div>
        <p className="login-tagline">Know where every rupee goes.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
            />
          </div>

          {error && (
            <div className="alert-banner danger" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="alert-banner info" role="status">
              <span>✓</span>
              <span>{message}</span>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <><span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Loading…</>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="divider" />

        <button
          type="button"
          className="btn btn-ghost btn-full"
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
          id="auth-toggle-btn"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

// Outer page — wraps LoginForm in Suspense so Next.js can prerender the shell.
// useSearchParams() inside LoginForm requires this boundary to exist.
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">PayFlow</div>
          <p className="login-tagline">Know where every rupee goes.</p>
          <div className="loading-container">
            <div className="loading-spinner" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
