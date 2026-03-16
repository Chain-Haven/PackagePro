import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function StationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('organizations(id)')
    .eq('user_id', user.id);

  const organization = Array.isArray(memberships?.[0]?.organizations)
    ? memberships?.[0]?.organizations?.[0]
    : memberships?.[0]?.organizations;
  const orgId = organization?.id;

  if (!orgId) {
    redirect('/onboarding');
  }

  const { data: stations } = await supabase
    .from('stations')
    .select('id, name, status, machine_id, last_heartbeat')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-3xl font-bold">Stations</h1>
      <p className="mt-2 text-muted-foreground">Manage your packing stations.</p>

      <div className="mt-6 space-y-4">
        {(stations ?? []).length > 0 ? (
          (stations ?? []).map((station) => (
            <div key={station.id} className="rounded-lg border border-border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{station.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Machine ID: {station.machine_id || 'Not set'}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase text-foreground">
                  {station.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Last heartbeat: {station.last_heartbeat ? new Date(station.last_heartbeat).toLocaleString() : 'Never'}
              </p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">No stations registered yet. Install the desktop app and run the setup wizard.</p>
        )}
      </div>
    </div>
  );
}
