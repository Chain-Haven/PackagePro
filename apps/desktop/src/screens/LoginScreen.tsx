import { useState } from 'react';
import { getSupabase } from '../lib/supabase';

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const packageProUrl = 'https://packagepro.io';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      onLogin();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/40">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary mb-4">
            <svg viewBox="0 0 64 64" fill="none" className="h-8 w-8">
              <path d="M18 24.5 32 17l14 7.5v15L32 47l-14-7.5v-15Z" fill="#fff" />
              <path d="M32 17v30" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" />
              <path
                d="m18 24.5 14 7.5 14-7.5"
                stroke="#2563EB"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground">PackagePro</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your fulfillment station</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3.5 text-base font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account? Create one at{' '}
          <button
            onClick={() => window.open(`${packageProUrl}/signup`)}
            className="text-primary hover:underline"
          >
            packagepro.io
          </button>
        </p>
      </div>
    </div>
  );
}
