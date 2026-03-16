'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Organization = { id: string; name: string; slug: string; role: string };
type Store = { id: string; name: string; url: string; pairing_code?: string | null; paired_at?: string | null; sync_status?: string | null };
type Station = { id: string; name: string; status: string };
type SetupState = { organizations: Organization[]; stores: Store[]; stations: Station[] };

const initialState: SetupState = { organizations: [], stores: [], stations: [] };

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function OnboardingFlow() {
  const router = useRouter();
  const [state, setState] = useState<SetupState>(initialState);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [pluginCode, setPluginCode] = useState('');
  const [stationName, setStationName] = useState('Main Packing Station');
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pairingSuccess, setPairingSuccess] = useState('');

  const primaryOrg = state.organizations[0] ?? null;
  const primaryStore = state.stores[0] ?? null;
  const storeIsPaired = Boolean(primaryStore?.paired_at);

  const currentStep = useMemo(() => {
    if (!primaryOrg) return 'organization' as const;
    if (!primaryStore) return 'store' as const;
    if (!storeIsPaired) return 'pair' as const;
    if (state.stations.length === 0) return 'station' as const;
    return 'done' as const;
  }, [primaryOrg, primaryStore, storeIsPaired, state.stations.length]);

  const loadSetupState = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const orgRes = await fetch('/api/organizations', { cache: 'no-store' });
      if (!orgRes.ok) throw new Error('Failed to load organizations');
      const { organizations = [] } = await orgRes.json();
      if (organizations.length === 0) { setState(initialState); setLoading(false); return; }

      const orgId = organizations[0].id;
      const [storesRes, stationsRes] = await Promise.all([
        fetch(`/api/stores?org_id=${orgId}`, { cache: 'no-store' }),
        fetch(`/api/stations?org_id=${orgId}`, { cache: 'no-store' }),
      ]);
      if (!storesRes.ok || !stationsRes.ok) throw new Error('Failed to load resources');
      const { stores = [] } = await storesRes.json();
      const { stations = [] } = await stationsRes.json();
      setState({ organizations, stores, stations });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSetupState(); }, [loadSetupState]);
  useEffect(() => { if (!orgSlug && orgName) setOrgSlug(slugify(orgName)); }, [orgName, orgSlug]);
  useEffect(() => { if (currentStep === 'done') { router.replace('/dashboard'); router.refresh(); } }, [currentStep, router]);

  async function handleCreateOrg(e: FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: orgName, slug: orgSlug }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed');
      await loadSetupState();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  async function handleCreateStore(e: FormEvent) {
    e.preventDefault(); if (!primaryOrg) return; setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: primaryOrg.id, name: storeName, url: storeUrl }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed');
      await loadSetupState();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  async function handlePairPlugin(e: FormEvent) {
    e.preventDefault(); if (!primaryStore) return; setSubmitting(true); setError(''); setPairingSuccess('');
    try {
      const res = await fetch(`/api/stores/${primaryStore.id}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairing_code: pluginCode }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Pairing failed');
      setPairingSuccess('Store paired successfully! The plugin is now connected.');
      await loadSetupState();
    } catch (err) { setError(err instanceof Error ? err.message : 'Pairing failed'); }
    finally { setSubmitting(false); }
  }

  async function handleCreateStation(e: FormEvent) {
    e.preventDefault(); if (!primaryOrg || !primaryStore) return; setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/stations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: primaryOrg.id, store_id: primaryStore.id, name: stationName, machine_id: machineId || undefined }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? 'Failed');
      await loadSetupState();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-muted/40 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">PackagePro Setup</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Get your first packing station online</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">Create your organization, connect your WooCommerce store, pair the plugin, and register a station.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {error && <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
            {pairingSuccess && <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{pairingSuccess}</div>}

            {loading && (
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            )}

            {!loading && currentStep === 'organization' && (
              <form className="space-y-5" onSubmit={handleCreateOrg}>
                <div>
                  <h2 className="text-2xl font-bold">Create your organization</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Top-level account that owns your stores, stations, and videos.</p>
                </div>
                <Field label="Organization name" htmlFor="orgName">
                  <input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="North Warehouse" />
                </Field>
                <Field label="Workspace slug" htmlFor="orgSlug">
                  <input id="orgSlug" value={orgSlug} onChange={(e) => setOrgSlug(slugify(e.target.value))} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="north-warehouse" />
                </Field>
                <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {submitting ? 'Creating...' : 'Continue'}
                </button>
              </form>
            )}

            {!loading && currentStep === 'store' && (
              <form className="space-y-5" onSubmit={handleCreateStore}>
                <div>
                  <h2 className="text-2xl font-bold">Add your WooCommerce store</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Enter the URL of the WooCommerce store where you installed the PackagePro plugin.</p>
                </div>
                <Field label="Store name" htmlFor="storeName">
                  <input id="storeName" value={storeName} onChange={(e) => setStoreName(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="My Store" />
                </Field>
                <Field label="Store URL" htmlFor="storeUrl">
                  <input id="storeUrl" type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="https://store.example.com" />
                </Field>
                <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {submitting ? 'Saving...' : 'Create store'}
                </button>
              </form>
            )}

            {!loading && currentStep === 'pair' && primaryStore && (
              <form className="space-y-5" onSubmit={handlePairPlugin}>
                <div>
                  <h2 className="text-2xl font-bold">Pair the WooCommerce plugin</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Open your WooCommerce store admin at <strong>{primaryStore.url}</strong>, go to <strong>WooCommerce &rarr; PackagePro</strong>, and copy the pairing code shown there. Paste it below.
                  </p>
                </div>

                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">Steps</p>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li><span className="font-semibold text-foreground">1.</span> Install the PackagePro plugin ZIP on your WooCommerce store</li>
                    <li><span className="font-semibold text-foreground">2.</span> Go to WP Admin &rarr; WooCommerce &rarr; PackagePro</li>
                    <li><span className="font-semibold text-foreground">3.</span> Copy the <strong>pairing code</strong> shown on that page</li>
                    <li><span className="font-semibold text-foreground">4.</span> Paste it below and click &ldquo;Pair Store&rdquo;</li>
                  </ol>
                </div>

                <Field label="Pairing code from WooCommerce plugin" htmlFor="pluginCode">
                  <input
                    id="pluginCode"
                    value={pluginCode}
                    onChange={(e) => setPluginCode(e.target.value.toUpperCase())}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-center text-2xl font-mono tracking-[0.3em] uppercase focus:border-primary focus:outline-none"
                    placeholder="ABCD1234"
                    maxLength={12}
                  />
                </Field>

                <button type="submit" disabled={submitting || pluginCode.length < 4} className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {submitting ? 'Pairing with plugin...' : 'Pair Store'}
                </button>
              </form>
            )}

            {!loading && currentStep === 'station' && (
              <form className="space-y-5" onSubmit={handleCreateStation}>
                <div>
                  <h2 className="text-2xl font-bold">Register your first station</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Name the packing bench so order locks and audit logs stay clear.</p>
                </div>
                <Field label="Station name" htmlFor="stationName">
                  <input id="stationName" value={stationName} onChange={(e) => setStationName(e.target.value)} required className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="Packing Bench A" />
                </Field>
                <Field label="Machine ID (optional)" htmlFor="machineId">
                  <input id="machineId" value={machineId} onChange={(e) => setMachineId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" placeholder="warehouse-mac-mini-01" />
                </Field>
                <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {submitting ? 'Registering...' : 'Finish setup'}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <ProgressCard title="Setup progress" items={[
              { label: 'Organization created', complete: Boolean(primaryOrg) },
              { label: 'Store added', complete: Boolean(primaryStore) },
              { label: 'Plugin paired', complete: storeIsPaired },
              { label: 'Station registered', complete: state.stations.length > 0 },
            ]} />
            <ProgressCard title="Current account" items={[
              { label: primaryOrg ? `${primaryOrg.name} (${primaryOrg.role})` : 'No organization yet', complete: Boolean(primaryOrg) },
              { label: primaryStore ? `${primaryStore.name} — ${storeIsPaired ? 'Paired' : 'Awaiting pairing'}` : 'No store yet', complete: Boolean(primaryStore) },
              { label: state.stations[0] ? `${state.stations[0].name} (${state.stations[0].status})` : 'No station yet', complete: state.stations.length > 0 },
            ]} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium">{label}{children}</label>;
}

function ProgressCard({ title, items }: { title: string; items: { label: string; complete: boolean }[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${item.complete ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground'}`}>
              {item.complete ? '✓' : '...'}
            </span>
            <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
