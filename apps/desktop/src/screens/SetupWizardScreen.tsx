import { useState, useEffect, useCallback } from 'react';
import { getSupabase, getBackendUrl } from '../lib/supabase';

interface Props {
  onComplete: (config: { orgId: string; storeId: string; stationId: string }) => void;
  onLogout: () => void;
}

type WizardStep = 'loading' | 'create-org' | 'select-store' | 'pair-plugin' | 'register-station' | 'ready';

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface Store {
  id: string;
  name: string;
  url: string;
  pairing_code: string | null;
  paired_at: string | null;
  sync_status: string | null;
}

export function SetupWizardScreen({ onComplete, onLogout }: Props) {
  const [step, setStep] = useState<WizardStep>('loading');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [userEmail, setUserEmail] = useState('');
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [orgName, setOrgName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [stationName, setStationName] = useState('Packing Station 1');

  const backendUrl = getBackendUrl();

  const loadState = useCallback(async () => {
    setError('');
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email ?? '');

    const { data: memberships } = await supabase
      .from('memberships')
      .select('role, organizations(id, name, slug)')
      .eq('user_id', user.id);

    const orgList: Org[] = (memberships ?? [])
      .map((m) => {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        return org as Org | null;
      })
      .filter((o): o is Org => o !== null);

    setOrgs(orgList);

    if (orgList.length === 0) {
      setStep('create-org');
      return;
    }

    const org = orgList[0];
    setSelectedOrg(org);

    const { data: storeList } = await supabase
      .from('stores')
      .select('id, name, url, pairing_code, paired_at, sync_status')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });

    setStores(storeList ?? []);

    if ((storeList ?? []).length === 0) {
      setStep('select-store');
      return;
    }

    const store = (storeList ?? [])[0];
    setSelectedStore(store);

    const { data: stations } = await supabase
      .from('stations')
      .select('id, name, status')
      .eq('org_id', org.id)
      .eq('store_id', store.id);

    if ((stations ?? []).length > 0) {
      const station = stations![0];
      await window.electronAPI.setConfig('backend_url', backendUrl);
      await window.electronAPI.setConfig('org_id', org.id);
      await window.electronAPI.setConfig('store_id', store.id);
      await window.electronAPI.setConfig('station_id', station.id);
      await window.electronAPI.setConfig('station_name', station.name);
      onComplete({ orgId: org.id, storeId: store.id, stationId: station.id });
      return;
    }

    setStep('register-station');
  }, [backendUrl, onComplete]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      await supabase.from('users').upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
      });

      const slug = orgName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const org: Org = { id: crypto.randomUUID(), name: orgName, slug };

      const { error: orgErr } = await supabase.from('organizations').insert(org);
      if (orgErr) throw new Error(orgErr.message);

      const { error: memErr } = await supabase
        .from('memberships')
        .insert({ user_id: user.id, org_id: org.id, role: 'org_owner' });
      if (memErr) throw new Error(memErr.message);

      setSelectedOrg(org);
      setOrgs([org]);
      setStep('select-store');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/stores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: selectedOrg.id, name: storeName, url: storeUrl }),
        credentials: 'include',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Failed (${res.status})`);
      }

      await loadStores();
      setStep('pair-plugin');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadStores() {
    if (!selectedOrg) return;
    const supabase = getSupabase();
    const { data } = await supabase
      .from('stores')
      .select('id, name, url, pairing_code, paired_at, sync_status')
      .eq('org_id', selectedOrg.id)
      .order('created_at', { ascending: false });
    setStores(data ?? []);
    if (data && data.length > 0) setSelectedStore(data[0]);
  }

  function handleSelectStore(store: Store) {
    setSelectedStore(store);
    if (store.paired_at) {
      setStep('register-station');
    } else {
      setStep('pair-plugin');
    }
  }

  async function handleRegisterStation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrg || !selectedStore) return;
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabase();
      const { data: station, error: stErr } = await supabase
        .from('stations')
        .insert({
          org_id: selectedOrg.id,
          store_id: selectedStore.id,
          name: stationName,
          status: 'online',
          last_heartbeat: new Date().toISOString(),
        })
        .select()
        .single();

      if (stErr || !station) throw new Error(stErr?.message ?? 'Failed to register station');

      await window.electronAPI.setConfig('backend_url', backendUrl);
      await window.electronAPI.setConfig('org_id', selectedOrg.id);
      await window.electronAPI.setConfig('store_id', selectedStore.id);
      await window.electronAPI.setConfig('station_id', station.id);
      await window.electronAPI.setConfig('station_name', station.name);

      setStep('ready');
      setTimeout(() => {
        onComplete({ orgId: selectedOrg.id, storeId: selectedStore.id, stationId: station.id });
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/40 p-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Station Setup</p>
            <h1 className="text-2xl font-bold">Configure this packing station</h1>
          </div>
          <button onClick={onLogout} className="text-xs text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>

        {userEmail && (
          <p className="mb-4 text-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{userEmail}</span></p>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === 'loading' && (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">Loading workspace...</p>
          </div>
        )}

        {step === 'create-org' && (
          <form onSubmit={handleCreateOrg} className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="text-lg font-bold">Create your organization</h2>
            <p className="text-sm text-muted-foreground">This is the workspace that owns your stores, stations, and videos.</p>
            <div>
              <label className="block text-xs font-medium mb-1">Organization name</label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                placeholder="North Warehouse"
                className="w-full rounded-lg border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
          </form>
        )}

        {step === 'select-store' && (
          <div className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="text-lg font-bold">Connect a WooCommerce store</h2>
            <p className="text-sm text-muted-foreground">Select an existing store or create a new one.</p>

            {stores.length > 0 && (
              <div className="space-y-2">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelectStore(store)}
                    className="w-full rounded-lg border border-border p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <p className="font-semibold">{store.name}</p>
                    <p className="text-xs text-muted-foreground">{store.url}</p>
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {store.paired_at ? 'Paired' : store.sync_status ?? 'pending'}
                    </span>
                  </button>
                ))}
                <div className="border-t border-border pt-3 mt-3" />
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-3">
              <p className="text-sm font-semibold">Add new store</p>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                placeholder="My WooCommerce Store"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="url"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                required
                placeholder="https://store.example.com"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Creating store...' : 'Create Store'}
              </button>
            </form>
          </div>
        )}

        {step === 'pair-plugin' && selectedStore && (
          <div className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="text-lg font-bold">Pair the WooCommerce plugin</h2>
            <p className="text-sm text-muted-foreground">
              Install the PackagePro plugin on <span className="font-medium text-foreground">{selectedStore.url}</span>, then enter the pairing code shown in WP Admin &rarr; WooCommerce &rarr; PackagePro.
            </p>

            {selectedStore.pairing_code && (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your store pairing code</p>
                <p className="mt-2 text-3xl font-mono font-bold tracking-widest text-primary">{selectedStore.pairing_code}</p>
                <p className="mt-2 text-xs text-muted-foreground">Enter this code in the WooCommerce plugin settings page</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold mb-2">Or enter the code from your plugin</p>
              <div className="flex gap-2">
                <input
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-mono uppercase tracking-widest focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('register-station')}
                className="flex-1 rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90"
              >
                Continue to Station Setup
              </button>
              <button
                onClick={() => setStep('select-store')}
                className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === 'register-station' && (
          <form onSubmit={handleRegisterStation} className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="text-lg font-bold">Register this station</h2>
            <p className="text-sm text-muted-foreground">
              Name this packing bench. Each station gets its own order lock and audit trail.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">Station name</label>
              <input
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                required
                placeholder="Packing Bench A"
                className="w-full rounded-lg border border-border px-4 py-3 focus:border-primary focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Finish Setup'}
            </button>
          </form>
        )}

        {step === 'ready' && (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold">Station ready</h2>
            <p className="mt-2 text-sm text-muted-foreground">Opening the packing dashboard...</p>
          </div>
        )}

        <StepIndicator current={step} />
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'create-org', label: 'Organization' },
    { key: 'select-store', label: 'Store' },
    { key: 'pair-plugin', label: 'Plugin' },
    { key: 'register-station', label: 'Station' },
    { key: 'ready', label: 'Ready' },
  ];

  const stepOrder = steps.map((s) => s.key);
  const currentIndex = stepOrder.indexOf(current);

  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      {steps.map((s, i) => {
        const isDone = currentIndex > i;
        const isActive = s.key === current;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                isDone
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
