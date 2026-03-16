import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShipStationSettings } from '@/components/settings/shipstation-settings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  const [{ data: stores }, { data: accounts }, { data: mappings }] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, url')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('shipstation_accounts')
      .select('id, label, connection_status, last_tested_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('shipstation_store_mappings')
      .select('id, store_id, shipstation_account_id, shipstation_store_id, shipstation_store_name')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Configure ShipStation accounts, test the connection, and map WooCommerce stores before
        desktop label purchase is enabled.
      </p>
      <div className="mt-6">
        <ShipStationSettings
          orgId={orgId}
          initialStores={(stores as any[]) || []}
          initialAccounts={(accounts as any[]) || []}
          initialMappings={(mappings as any[]) || []}
        />
      </div>
    </div>
  );
}
