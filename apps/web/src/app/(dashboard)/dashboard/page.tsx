import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('role, organizations(id, name, slug)')
    .eq('user_id', user.id);

  const primaryMembership = memberships?.[0];
  const organization = Array.isArray(primaryMembership?.organizations)
    ? primaryMembership.organizations[0]
    : primaryMembership?.organizations;
  const membershipRole = primaryMembership?.role ?? 'member';

  if (!organization) {
    redirect('/onboarding');
  }

  const [{ count: storeCount }, { count: stationCount }, { count: orderCount }, { count: videoCount }, { data: stores }, { data: stations }] =
    await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
      supabase.from('stations').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
      supabase
        .from('stores')
        .select('id, name, url, sync_status, paired_at')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('stations')
        .select('id, name, status, last_heartbeat')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Overview</p>
        <h1 className="mt-2 text-3xl font-bold">{organization.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Workspace slug: <span className="font-medium text-foreground">{organization.slug}</span>. Signed in as{' '}
          <span className="font-medium text-foreground">{membershipRole}</span>.
        </p>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Connected Stores" value={String(storeCount ?? 0)} />
        <DashboardCard title="Active Stations" value={String(stationCount ?? 0)} />
        <DashboardCard title="Orders Synced" value={String(orderCount ?? 0)} />
        <DashboardCard title="Videos Recorded" value={String(videoCount ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Stores</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your WooCommerce connections and pairing status.</p>

          <div className="mt-4 space-y-3">
            {(stores ?? []).length > 0 ? (
              (stores ?? []).map((store) => (
                <div key={store.id} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-sm text-muted-foreground">{store.url}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {store.paired_at ? 'Paired' : store.sync_status ?? 'pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No stores connected yet. Use the onboarding flow or visit the Stores page to add one.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Stations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Registered packing benches that can claim orders.</p>

          <div className="mt-4 space-y-3">
            {(stations ?? []).length > 0 ? (
              (stations ?? []).map((station) => (
                <div key={station.id} className="rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{station.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last heartbeat: {station.last_heartbeat ? new Date(station.last_heartbeat).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase text-foreground">
                      {station.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No stations registered yet. Finish onboarding to create your first station.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
