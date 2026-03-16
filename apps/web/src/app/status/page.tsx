import { getHealthSnapshot } from '@/lib/health';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWebEnv } from '@/lib/env';

export const metadata = {
  title: 'PackagePro Status',
  description: 'Current PackagePro platform status and operational readiness summary.',
};

type HealthResponse = {
  status: 'ok' | 'degraded';
  checks: {
    supabase: 'ok' | 'error';
    cron: 'configured' | 'missing';
  };
  timestamp: string;
};

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  const health = (await getHealthSnapshot(createAdminClient, getWebEnv)) as HealthResponse;
  const statusChecks = [
    { label: 'Platform health', value: health?.status === 'ok' ? 'Operational' : 'Degraded' },
    { label: 'Supabase connectivity', value: health?.checks.supabase === 'ok' ? 'Connected' : 'Unavailable' },
    { label: 'Maintenance cron', value: health?.checks.cron === 'configured' ? 'Configured' : 'Missing' },
    { label: 'Last health timestamp', value: health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'Unavailable' },
  ];

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Status</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Platform readiness</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          This page summarizes the current live state of the PackagePro deployment and the core user flows required for onboarding and fulfillment setup.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {statusChecks.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
