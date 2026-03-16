import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StoresPage() {
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

  const { data: stores } = await supabase
    .from('stores')
    .select('id, name, url, sync_status, paired_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stores</h1>
        <Link href="/stores/connect" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Connect Store
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">Manage your WooCommerce store connections.</p>

      <div className="mt-6 space-y-4">
        {(stores ?? []).length > 0 ? (
          (stores ?? []).map((store) => (
            <div key={store.id} className="rounded-lg border border-border bg-background p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{store.name}</h2>
                  <p className="text-sm text-muted-foreground">{store.url}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {store.paired_at ? 'Paired' : store.sync_status ?? 'pending'}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">No stores connected yet. Connect your first WooCommerce store to get started.</p>
        )}
      </div>
    </div>
  );
}
