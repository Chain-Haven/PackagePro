'use client';

import { useMemo, useState } from 'react';

type Store = {
  id: string;
  name: string;
  url: string;
};

type Account = {
  id: string;
  label: string;
  connection_status: string;
  last_tested_at?: string | null;
};

type Mapping = {
  id: string;
  store_id: string;
  shipstation_account_id: string;
  shipstation_store_id: string;
  shipstation_store_name?: string | null;
};

type RemoteShipStationStore = {
  storeId: number;
  storeName: string;
};

type Props = {
  orgId: string;
  initialStores: Store[];
  initialAccounts: Account[];
  initialMappings: Mapping[];
};

export function ShipStationSettings({
  orgId,
  initialStores,
  initialAccounts,
  initialMappings,
}: Props) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [mappings, setMappings] = useState(initialMappings);
  const [remoteStores, setRemoteStores] = useState<Record<string, RemoteShipStationStore[]>>({});
  const [accountForm, setAccountForm] = useState({
    label: '',
    api_key: '',
    api_secret: '',
  });
  const [loadingAccountId, setLoadingAccountId] = useState<string | null>(null);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const mappingsByStore = useMemo(() => {
    const entries = new Map<string, Mapping[]>();
    mappings.forEach((mapping) => {
      const current = entries.get(mapping.store_id) ?? [];
      current.push(mapping);
      entries.set(mapping.store_id, current);
    });
    return entries;
  }, [mappings]);

  async function refreshAccounts() {
    const res = await fetch(`/api/shipstation/accounts?org_id=${orgId}`, {
      cache: 'no-store',
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to refresh accounts');
    setAccounts(payload.accounts || []);
  }

  async function refreshMappings() {
    const res = await fetch(`/api/shipstation/mappings?org_id=${orgId}`, {
      cache: 'no-store',
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to refresh mappings');
    setMappings(payload.mappings || []);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    const res = await fetch('/api/shipstation/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, ...accountForm }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error || 'Failed to create account');
      return;
    }

    setAccountForm({ label: '', api_key: '', api_secret: '' });
    setMessage('ShipStation account saved.');
    await refreshAccounts();
  }

  async function handleTestConnection(accountId: string) {
    setError('');
    setMessage('');
    setLoadingAccountId(accountId);
    try {
      const res = await fetch(`/api/shipstation/test?account_id=${accountId}`, {
        cache: 'no-store',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Connection test failed');
      await refreshAccounts();
      setMessage(payload.success ? 'Connection test passed.' : 'Connection test failed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setLoadingAccountId(null);
    }
  }

  async function handleLoadRemoteStores(accountId: string) {
    setError('');
    setLoadingAccountId(accountId);
    try {
      const res = await fetch(`/api/shipstation/stores?account_id=${accountId}`, {
        cache: 'no-store',
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load ShipStation stores');
      setRemoteStores((current) => ({
        ...current,
        [accountId]: payload.stores || [],
      }));
      setMessage('Loaded ShipStation stores for mapping.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ShipStation stores');
    } finally {
      setLoadingAccountId(null);
    }
  }

  async function handleSaveMapping(
    storeId: string,
    accountId: string,
    shipstationStoreId: string,
    shipstationStoreName: string
  ) {
    setError('');
    setMessage('');
    setSavingStoreId(storeId);
    try {
      const res = await fetch('/api/shipstation/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          shipstation_account_id: accountId,
          shipstation_store_id: shipstationStoreId,
          shipstation_store_name: shipstationStoreName,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to save mapping');
      await refreshMappings();
      setMessage('Store mapping saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setSavingStoreId(null);
    }
  }

  async function handleDeleteMapping(mappingId: string) {
    setError('');
    setMessage('');
    const res = await fetch(`/api/shipstation/mappings/${mappingId}`, {
      method: 'DELETE',
    });
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error || 'Failed to delete mapping');
      return;
    }
    await refreshMappings();
    setMessage('Store mapping removed.');
  }

  return (
    <div className="space-y-8">
      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-destructive/20 bg-destructive/5 text-destructive'
              : 'border-primary/20 bg-primary/5 text-primary'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-bold">Add ShipStation account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Store encrypted ShipStation credentials for this organization. These credentials never go
          to the desktop client directly.
        </p>
        <form onSubmit={handleCreateAccount} className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={accountForm.label}
            onChange={(e) => setAccountForm((current) => ({ ...current, label: e.target.value }))}
            placeholder="Account label"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
          <input
            value={accountForm.api_key}
            onChange={(e) => setAccountForm((current) => ({ ...current, api_key: e.target.value }))}
            placeholder="ShipStation API key"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            required
          />
          <input
            value={accountForm.api_secret}
            onChange={(e) => setAccountForm((current) => ({ ...current, api_secret: e.target.value }))}
            placeholder="ShipStation API secret"
            className="rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground md:w-fit"
          >
            Save account
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-bold">ShipStation accounts</h2>
        <div className="mt-4 space-y-4">
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No ShipStation accounts configured yet.</p>
          )}
          {accounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{account.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {account.connection_status}
                    {account.last_tested_at
                      ? ` · Last tested ${new Date(account.last_tested_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(account.id)}
                    disabled={loadingAccountId === account.id}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                  >
                    {loadingAccountId === account.id ? 'Testing...' : 'Test connection'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadRemoteStores(account.id)}
                    disabled={loadingAccountId === account.id}
                    className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary"
                  >
                    Load stores
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-bold">WooCommerce to ShipStation mapping</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Each WooCommerce store can map to one or more ShipStation account and ShipStation store
          pairs before desktop label creation is enabled.
        </p>
        <div className="mt-4 space-y-4">
          {initialStores.length === 0 && (
            <p className="text-sm text-muted-foreground">Add a WooCommerce store first.</p>
          )}
          {initialStores.map((store) => {
            const existingMappings = mappingsByStore.get(store.id) ?? [];
            const mappedAccountId = existingMappings[0]?.shipstation_account_id || accounts[0]?.id || '';
            const accountStores = remoteStores[mappedAccountId] || [];

            return (
              <div key={store.id} className="rounded-xl border border-border p-4">
                <div className="mb-3">
                  <p className="font-semibold">{store.name}</p>
                  <p className="text-xs text-muted-foreground">{store.url}</p>
                  {existingMappings.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {existingMappings.map((mapping) => {
                        const mappingAccount = accounts.find(
                          (account) => account.id === mapping.shipstation_account_id
                        );
                        return (
                          <div
                            key={mapping.id}
                            className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs"
                          >
                            <span>
                              {mappingAccount?.label || 'Mapped account'} {'->'}{' '}
                              {mapping.shipstation_store_name || mapping.shipstation_store_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMapping(mapping.id)}
                              className="rounded-lg border border-destructive/30 px-2 py-1 font-semibold text-destructive"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <select
                    defaultValue={mappedAccountId}
                    id={`account-${store.id}`}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                  </select>
                  <select
                    defaultValue={existingMappings[0]?.shipstation_store_id || ''}
                    id={`shipstation-store-${store.id}`}
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <option value="">Select ShipStation store</option>
                    {accountStores.map((remoteStore) => (
                      <option key={remoteStore.storeId} value={String(remoteStore.storeId)}>
                        {remoteStore.storeName}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const accountId = (
                          document.getElementById(`account-${store.id}`) as HTMLSelectElement | null
                        )?.value;
                        if (accountId) {
                          void handleLoadRemoteStores(accountId);
                        }
                      }}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                    >
                      Refresh stores
                    </button>
                    <button
                      type="button"
                      disabled={savingStoreId === store.id}
                      onClick={() => {
                        const accountId = (
                          document.getElementById(`account-${store.id}`) as HTMLSelectElement | null
                        )?.value;
                        const shipstationStoreId = (
                          document.getElementById(`shipstation-store-${store.id}`) as HTMLSelectElement | null
                        )?.value;
                        const shipstationStoreName = accountStores.find(
                          (remoteStore) => String(remoteStore.storeId) === shipstationStoreId
                        )?.storeName;

                        if (accountId && shipstationStoreId && shipstationStoreName) {
                          void handleSaveMapping(store.id, accountId, shipstationStoreId, shipstationStoreName);
                        } else {
                          setError('Choose an account and ShipStation store before saving the mapping.');
                        }
                      }}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      {savingStoreId === store.id ? 'Saving...' : 'Save mapping'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
