import { useState, useEffect, useCallback } from 'react';
import { ScannerInput } from '../components/ScannerInput';
import { StatusBanner } from '../components/StatusBanner';
import { uploadQueue } from '../lib/upload-queue';
import { api, apiCall } from '../lib/api';
import { getSupabase } from '../lib/supabase';
import { STATION_HEARTBEAT_INTERVAL_MS } from '@packagepro/shared';
import { type DashboardHealthIssue, diagnoseDashboardIssue } from '../lib/dashboard-health';
import { getDesktopBackendUrl } from '../lib/env';

interface Props {
  stationId: string;
  onLogout: () => void;
  onOpenSetup: () => void;
  onStartPacking: (orderId: string) => void;
}

interface Order {
  id: string;
  woo_order_number: string;
  customer_name: string;
  status: string;
  video_status: string;
  created_at: string;
  order_total: string;
}

type Tab = 'orders' | 'search' | 'uploads';

export function DashboardScreen({ stationId, onLogout, onOpenSetup, onStartPacking }: Props) {
  const [stationStatus, setStationStatus] = useState<'ready' | 'busy' | 'error'>('ready');
  const [pendingUploads, setPendingUploads] = useState(0);
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'packed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [stationName, setStationName] = useState('');
  const [packedToday, setPackedToday] = useState(0);
  const [scanError, setScanError] = useState('');
  const [stationIssue, setStationIssue] = useState<DashboardHealthIssue | null>(null);
  const [autoFixing, setAutoFixing] = useState(false);
  const [orgRole, setOrgRole] = useState<string | null>(null);

  useEffect(() => {
    const unsub = uploadQueue.subscribe((jobs) => {
      setPendingUploads(jobs.filter((j) => j.status !== 'completed').length);
    });
    return unsub;
  }, []);

  async function loadStationInfo() {
    try {
      const name = await window.electronAPI.getConfig('station_name');
      if (typeof name === 'string') setStationName(name);
      await api.heartbeat(stationId);
      setStationStatus('ready');
      setStationIssue(null);
    } catch (err) {
      void handleStationFailure('heartbeat', err);
    }
  }

  const fetchOrdersAndStats = useCallback(async () => {
    const orgId = (await window.electronAPI.getConfig('org_id')) as string;
    const storeId = (await window.electronAPI.getConfig('store_id')) as string;
    if (!orgId) {
      throw new Error('Missing organization configuration');
    }

    const params: Record<string, string> = { org_id: orgId, per_page: '50' };
    if (storeId) params.store_id = storeId;
    if (orderFilter === 'pending') params.video_status = 'none';
    if (orderFilter === 'packed') params.video_status = 'ready';

    const res = await apiCall<{ orders: Order[]; total: number }>(
      `/api/orders?${new URLSearchParams(params)}`
    );

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await getSupabase()
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('ready_at', startOfDay.toISOString());

    return {
      orgId,
      orders: res.orders ?? [],
      packedToday: count ?? 0,
    };
  }, [orderFilter]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const snapshot = await fetchOrdersAndStats();
      setOrders(snapshot.orders);
      setPackedToday(snapshot.packedToday);
      setStationStatus('ready');
      setStationIssue(null);
    } catch (err) {
      await handleStationFailure('orders', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [fetchOrdersAndStats]);

  const loadOrgRole = useCallback(async () => {
    try {
      const orgId = (await window.electronAPI.getConfig('org_id')) as string;
      if (!orgId) return;
      const { organizations } = await api.listOrganizations();
      const currentOrg = organizations.find((organization) => organization.id === orgId);
      setOrgRole(currentOrg?.role ?? null);
    } catch {
      setOrgRole(null);
    }
  }, []);

  async function handleStationFailure(failedCheck: 'heartbeat' | 'orders', sourceError: unknown) {
    setStationStatus('error');
    setAutoFixing(true);

    const backendUrl = await window.electronAPI.getConfig('backend_url');
    const orgId = (await window.electronAPI.getConfig('org_id')) as string;
    const storeId = (await window.electronAPI.getConfig('store_id')) as string;
    const currentStationId = (await window.electronAPI.getConfig('station_id')) as string | null;
    const {
      data: { session },
    } = await getSupabase().auth.getSession();

    if (typeof backendUrl !== 'string' || !backendUrl) {
      try {
        await window.electronAPI.setConfigMany({ backend_url: getDesktopBackendUrl() });
      } catch {
        setStationIssue(diagnoseDashboardIssue({ missingBackendUrl: true }));
        setAutoFixing(false);
        return;
      }
    }

    if (!orgId || !storeId || !currentStationId) {
      setStationIssue(diagnoseDashboardIssue({ missingStationConfig: true }));
      setAutoFixing(false);
      return;
    }

    if (!session) {
      setStationIssue(diagnoseDashboardIssue({ missingSession: true }));
      setAutoFixing(false);
      return;
    }

    let backendDegraded = false;
    try {
      const health = await api.getHealth();
      backendDegraded = health.status === 'degraded';
      if (
        backendDegraded &&
        orgRole &&
        ['org_owner', 'org_admin', 'warehouse_manager'].includes(orgRole)
      ) {
        await api.runOperationalSelfHeal(orgId).catch(() => {});
      }
    } catch {
      backendDegraded = true;
    }

    try {
      await api.heartbeat(currentStationId);
      const snapshot = await fetchOrdersAndStats();
      setOrders(snapshot.orders);
      setPackedToday(snapshot.packedToday);
      setStationStatus('ready');
      setStationIssue(null);
      setAutoFixing(false);
      return;
    } catch (recoveryError) {
      setStationIssue(
        diagnoseDashboardIssue({
          missingBackendUrl: typeof backendUrl !== 'string' || !backendUrl,
          backendDegraded,
          rawErrorMessage:
            recoveryError instanceof Error
              ? recoveryError.message
              : String(recoveryError ?? sourceError),
          failedCheck,
        })
      );
    } finally {
      setAutoFixing(false);
    }
  }

  useEffect(() => {
    void loadOrgRole();
  }, [loadOrgRole]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => {
      clearInterval(interval);
    };
  }, [loadOrders]);

  useEffect(() => {
    loadStationInfo();
    const heartbeatInterval = setInterval(() => {
      api.heartbeat(stationId).catch((err) => {
        void handleStationFailure('heartbeat', err);
      });
    }, STATION_HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [stationId]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const orgId = (await window.electronAPI.getConfig('org_id')) as string;
      if (!orgId) return;
      const res = await apiCall<{ orders: Order[] }>(
        `/api/orders?${new URLSearchParams({ org_id: orgId, search: searchQuery, per_page: '20' })}`
      );
      setSearchResults(res.orders ?? []);
    } catch {
      /* skip */
    }
  }

  async function handleScan(barcode: string) {
    setScanError('');
    try {
      const orgId = (await window.electronAPI.getConfig('org_id')) as string;
      const storeId = (await window.electronAPI.getConfig('store_id')) as string;
      if (!orgId) {
        setScanError('Station is missing its organization configuration');
        return;
      }

      const res = await apiCall<{ order?: Order }>(
        `/api/orders/resolve?${new URLSearchParams({
          org_id: orgId,
          ...(storeId ? { store_id: storeId } : {}),
          scan: barcode,
        })}`
      );

      if (!res.order?.id) {
        setScanError(`No order found for scan: ${barcode}`);
        return;
      }

      onStartPacking(res.order.id);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Failed to resolve scanned order');
    }
  }

  const videoStatusBadge = (vs: string) => {
    const colors: Record<string, string> = {
      none: 'bg-muted text-muted-foreground',
      recording: 'bg-amber-100 text-amber-800',
      uploading: 'bg-blue-100 text-blue-800',
      ready: 'bg-emerald-100 text-emerald-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[vs] ?? colors.none}`}
      >
        {vs}
      </span>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <StatusBanner
        status={stationStatus}
        stationName={stationName || `Station ${stationId.slice(0, 8)}`}
        issueCode={stationIssue?.code ?? null}
        issueSummary={stationIssue?.message ?? null}
      />

      <div className="flex flex-1 flex-col p-6 gap-6 overflow-hidden">
        {stationIssue && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-destructive">{stationIssue.title}</p>
                <p className="text-xs text-destructive/80">Code: {stationIssue.code}</p>
              </div>
              {stationIssue.autoFixAvailable && (
                <button
                  onClick={() =>
                    void handleStationFailure('orders', new Error(stationIssue.message))
                  }
                  disabled={autoFixing}
                  className="rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                >
                  {autoFixing ? 'Trying Auto-Fix...' : 'Run Auto-Fix'}
                </button>
              )}
            </div>
            <p className="mt-3 text-destructive">{stationIssue.message}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-destructive/90">
              {stationIssue.fixSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            {!stationIssue.autoFixAvailable && stationIssue.code === 'AUTH_SESSION_MISSING' && (
              <button
                onClick={onLogout}
                className="mt-4 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Sign In Again
              </button>
            )}
            {!stationIssue.autoFixAvailable && stationIssue.code === 'CONFIG_STATION_MISSING' && (
              <button
                onClick={onOpenSetup}
                className="mt-4 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive"
              >
                Open Setup
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Packing Station</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Scan a barcode or select an order below
            </p>
          </div>
          <ScannerInput onScan={handleScan} />
        </div>
        {scanError && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2 text-sm text-destructive">
            {scanError}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Orders in Queue" value={String(orders.length)} />
          <StatCard label="Packed Today" value={String(packedToday)} />
          <StatCard label="Uploads Pending" value={String(pendingUploads)} />
          <StatCard
            label="Station"
            value={stationStatus.toUpperCase()}
            color={
              stationStatus === 'ready'
                ? 'text-emerald-600'
                : stationStatus === 'error'
                  ? 'text-red-600'
                  : ''
            }
          />
        </div>

        <div className="flex gap-2 border-b border-border">
          {(
            [
              ['orders', 'Order Queue'],
              ['search', 'Search'],
              ['uploads', 'Upload Queue'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {label}
              {key === 'uploads' && pendingUploads > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendingUploads}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'orders' && (
            <div>
              <div className="flex gap-2 mb-3">
                {(['pending', 'packed', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setOrderFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${orderFilter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    {f === 'pending' ? 'Ready to Pack' : f === 'packed' ? 'Packed' : 'All'}
                  </button>
                ))}
                <button
                  onClick={() => loadOrders()}
                  disabled={ordersLoading}
                  className="ml-auto rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  {ordersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {orders.length === 0 && !ordersLoading && (
                <div className="rounded-xl border border-dashed border-border py-12 text-center">
                  <p className="text-lg text-muted-foreground">No orders in queue</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Orders will appear here once synced from WooCommerce
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onStartPacking(o.id)}
                    className="w-full flex items-center justify-between rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-bold">#{o.woo_order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.customer_name} — {o.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {videoStatusBadge(o.video_status)}
                      <span className="text-xs text-muted-foreground">{o.order_total}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'search' && (
            <div>
              <div className="flex gap-2 mb-3">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by order #, name, or email"
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm"
                />
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Search
                </button>
              </div>
              <div className="space-y-2">
                {searchResults.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => onStartPacking(o.id)}
                    className="w-full flex items-center justify-between rounded-xl border border-border p-4 text-left hover:border-primary/40 transition-colors"
                  >
                    <div>
                      <p className="font-bold">#{o.woo_order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                    </div>
                    {videoStatusBadge(o.video_status)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'uploads' && <UploadQueueTab />}
        </div>
      </div>
    </div>
  );
}

function UploadQueueTab() {
  const [jobs, setJobs] = useState(uploadQueue.getJobs());
  useEffect(() => uploadQueue.subscribe(setJobs), []);

  if (jobs.length === 0)
    return <p className="py-8 text-center text-muted-foreground">No pending uploads</p>;

  return (
    <div className="space-y-2">
      {jobs.map((j) => (
        <div
          key={j.id}
          className="flex items-center justify-between rounded-xl border border-border p-3"
        >
          <div>
            <p className="text-sm font-medium">{j.videoId.slice(0, 12)}...</p>
            <p className="text-xs text-muted-foreground">
              Attempt {j.attempts} — {j.status}
            </p>
            {j.lastError && <p className="text-xs text-destructive">{j.lastError}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : j.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}
            >
              {j.status}
            </span>
            {j.status === 'failed' && (
              <button
                onClick={() => uploadQueue.retryFailed(j.id)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? ''}`}>{value}</p>
    </div>
  );
}
