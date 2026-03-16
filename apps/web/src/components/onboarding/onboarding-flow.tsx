'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Organization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type Store = {
  id: string;
  name: string;
  url: string;
  pairing_code?: string | null;
  paired_at?: string | null;
  sync_status?: string | null;
};

type Station = {
  id: string;
  name: string;
  status: string;
};

type SetupState = {
  organizations: Organization[];
  stores: Store[];
  stations: Station[];
};

const initialState: SetupState = {
  organizations: [],
  stores: [],
  stations: [],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function OnboardingFlow() {
  const router = useRouter();
  const [state, setState] = useState<SetupState>(initialState);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [stationName, setStationName] = useState('Main Packing Station');
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const primaryOrg = state.organizations[0] ?? null;
  const primaryStore = state.stores[0] ?? null;

  const currentStep = useMemo(() => {
    if (!primaryOrg) return 'organization';
    if (!primaryStore) return 'store';
    if (state.stations.length === 0) return 'station';
    return 'done';
  }, [primaryOrg, primaryStore, state.stations.length]);

  const loadSetupState = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const orgRes = await fetch('/api/organizations', { cache: 'no-store' });
      if (!orgRes.ok) {
        throw new Error('Failed to load organizations');
      }

      const orgPayload = await orgRes.json();
      const organizations: Organization[] = orgPayload.organizations ?? [];

      if (organizations.length === 0) {
        setState(initialState);
        setLoading(false);
        return;
      }

      const orgId = organizations[0].id;
      const [storesRes, stationsRes] = await Promise.all([
        fetch(`/api/stores?org_id=${orgId}`, { cache: 'no-store' }),
        fetch(`/api/stations?org_id=${orgId}`, { cache: 'no-store' }),
      ]);

      if (!storesRes.ok || !stationsRes.ok) {
        throw new Error('Failed to load onboarding resources');
      }

      const storesPayload = await storesRes.json();
      const stationsPayload = await stationsRes.json();

      setState({
        organizations,
        stores: storesPayload.stores ?? [],
        stations: stationsPayload.stations ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSetupState();
  }, [loadSetupState]);

  useEffect(() => {
    if (!orgSlug && orgName) {
      setOrgSlug(slugify(orgName));
    }
  }, [orgName, orgSlug]);

  useEffect(() => {
    if (currentStep === 'done') {
      router.replace('/dashboard');
      router.refresh();
    }
  }, [currentStep, router]);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create organization');
      }

      await loadSetupState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryOrg) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: primaryOrg.id,
          name: storeName,
          url: storeUrl,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create store');
      }

      await loadSetupState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateStation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!primaryOrg || !primaryStore) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: primaryOrg.id,
          store_id: primaryStore.id,
          name: stationName,
          machine_id: machineId || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to register station');
      }

      await loadSetupState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register station');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">PackagePro Setup</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Get your first packing station online</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            This setup creates your organization, connects your WooCommerce store, and registers the first station that will record proof-of-packing videos.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {error ? (
              <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
              </div>
            ) : null}

            {!loading && currentStep === 'organization' ? (
              <form className="space-y-5" onSubmit={handleCreateOrganization}>
                <div>
                  <h2 className="text-2xl font-bold">Create your organization</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This is the top-level account that owns your stores, stations, videos, and audit logs.
                  </p>
                </div>

                <Field label="Organization name" htmlFor="orgName">
                  <input
                    id="orgName"
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="North Warehouse"
                  />
                </Field>

                <Field label="Workspace slug" htmlFor="orgSlug">
                  <input
                    id="orgSlug"
                    value={orgSlug}
                    onChange={(event) => setOrgSlug(slugify(event.target.value))}
                    required
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="north-warehouse"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Creating organization...' : 'Continue'}
                </button>
              </form>
            ) : null}

            {!loading && currentStep === 'store' ? (
              <form className="space-y-5" onSubmit={handleCreateStore}>
                <div>
                  <h2 className="text-2xl font-bold">Connect your WooCommerce store</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create the store record now, then install the PackagePro WooCommerce plugin and pair it with the generated code.
                  </p>
                </div>

                <Field label="Store name" htmlFor="storeName">
                  <input
                    id="storeName"
                    value={storeName}
                    onChange={(event) => setStoreName(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="Main WooCommerce Store"
                  />
                </Field>

                <Field label="Store URL" htmlFor="storeUrl">
                  <input
                    id="storeUrl"
                    type="url"
                    value={storeUrl}
                    onChange={(event) => setStoreUrl(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="https://store.example.com"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Saving store...' : 'Create store'}
                </button>
              </form>
            ) : null}

            {!loading && currentStep === 'station' ? (
              <form className="space-y-5" onSubmit={handleCreateStation}>
                <div>
                  <h2 className="text-2xl font-bold">Register your first station</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This creates the first fulfillment workstation so the desktop app can claim orders and upload videos safely.
                  </p>
                </div>

                <Field label="Station name" htmlFor="stationName">
                  <input
                    id="stationName"
                    value={stationName}
                    onChange={(event) => setStationName(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="Packing Bench A"
                  />
                </Field>

                <Field label="Machine ID (optional)" htmlFor="machineId">
                  <input
                    id="machineId"
                    value={machineId}
                    onChange={(event) => setMachineId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 transition focus:border-primary"
                    placeholder="warehouse-mac-mini-01"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {submitting ? 'Registering station...' : 'Finish setup'}
                </button>
              </form>
            ) : null}
          </div>

          <div className="space-y-6">
            <ProgressCard
              title="Setup progress"
              items={[
                { label: 'Organization created', complete: Boolean(primaryOrg) },
                { label: 'Store connected', complete: Boolean(primaryStore) },
                { label: 'Station registered', complete: state.stations.length > 0 },
              ]}
            />

            <ProgressCard
              title="Current account"
              items={[
                { label: primaryOrg ? `${primaryOrg.name} (${primaryOrg.role})` : 'No organization yet', complete: Boolean(primaryOrg) },
                { label: primaryStore ? `${primaryStore.name} (${primaryStore.sync_status ?? 'pending'})` : 'No store yet', complete: Boolean(primaryStore) },
                { label: state.stations[0] ? `${state.stations[0].name} (${state.stations[0].status})` : 'No station yet', complete: state.stations.length > 0 },
              ]}
            />

            {primaryStore ? (
              <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <h3 className="text-lg font-bold">WooCommerce pairing</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Install the PackagePro plugin on your WooCommerce store and enter the pairing code shown in the store record.
                </p>
                <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Store URL</p>
                  <p className="mt-1 text-sm font-medium">{primaryStore.url}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function ProgressCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; complete: boolean }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <h3 className="text-lg font-bold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-sm">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                item.complete
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {item.complete ? 'OK' : '...'}
            </span>
            <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
