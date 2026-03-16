'use client';

import { useEffect, useRef, useState } from 'react';
import type { OperationalHealthCheck } from '@/lib/operational-health';

type HealthResponse = {
  status: 'ok' | 'warning' | 'error';
  checks: OperationalHealthCheck[];
  timestamp: string;
};

export function SystemHealthPanel({ orgId }: { orgId: string }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [message, setMessage] = useState('');
  const autoFixAttemptedRef = useRef(false);

  async function loadHealth() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/health?org_id=${orgId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load health checks');
      }
      setHealth(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load health checks');
    } finally {
      setLoading(false);
    }
  }

  async function runAutoFix() {
    setRepairing(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/self-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Auto-fix failed');
      }
      setMessage('Auto-fix completed. Re-running health checks...');
      await loadHealth();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Auto-fix failed');
    } finally {
      setRepairing(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, [orgId]);

  useEffect(() => {
    if (!health || autoFixAttemptedRef.current) return;
    if (!health.checks.some((check) => check.autoFixAvailable && check.status !== 'ok')) return;

    autoFixAttemptedRef.current = true;
    void runAutoFix();
  }, [health]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">System Health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exact health codes, recommended fixes, and automatic repair for recoverable issues.
          </p>
        </div>
        <button
          onClick={() => void runAutoFix()}
          disabled={repairing || loading}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50"
        >
          {repairing ? 'Running Auto-Fix...' : 'Run Auto-Fix'}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          {message}
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading health checks...</p>}

      {!loading && health && (
        <div className="mt-6 space-y-3">
          {health.checks.map((check) => (
            <div key={check.code} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Code: {check.code}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    check.status === 'ok'
                      ? 'bg-emerald-100 text-emerald-800'
                      : check.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {check.status}
                </span>
              </div>
              <p className="mt-3 text-sm">{check.message}</p>
              <p className="mt-2 text-sm text-muted-foreground">{check.fix}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
