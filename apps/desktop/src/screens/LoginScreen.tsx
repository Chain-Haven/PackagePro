import { useState } from 'react';

interface Props {
  onLogin: (stationId?: string) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3000');
  const [stationId, setStationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await window.electronAPI.setConfig('backend_url', backendUrl);
      await window.electronAPI.setConfig('email', email);
      if (stationId) {
        await window.electronAPI.setConfig('station_id', stationId);
      }

      // TODO: Implement actual Supabase auth
      onLogin(stationId || undefined);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">PackagePro</h1>
          <p className="mt-2 text-muted-foreground">Fulfillment Station</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded bg-destructive/20 p-3 text-sm text-destructive">{error}</div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Backend URL</label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Station ID (optional)</label>
            <input
              type="text"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
              placeholder="e.g. station-1"
              className="w-full rounded-lg border border-border bg-muted px-4 py-3 focus:border-primary focus:outline-none"
            />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-lg focus:border-primary focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-border bg-muted px-4 py-3 text-lg focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 text-lg font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
