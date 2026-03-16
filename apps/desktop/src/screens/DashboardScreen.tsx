import { useState, useEffect, useCallback } from 'react';
import { ScannerInput } from '../components/ScannerInput';
import { StatusBanner } from '../components/StatusBanner';
import { uploadQueue } from '../lib/upload-queue';
import { apiCall } from '../lib/api';
import { getSupabase } from '../lib/supabase';

interface Props {
  stationId: string;
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

export function DashboardScreen({ stationId, onStartPacking }: Props) {
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

  useEffect(() => {
    const unsub = uploadQueue.subscribe((jobs) => {
      setPendingUploads(jobs.filter((j) => j.status !== 'completed').length);
    });
    return unsub;
  }, []);

  useEffect(() => {
    loadOrders();
    loadStationInfo();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [orderFilter]);

  async function loadStationInfo() {
    try {
      const name = await window.electronAPI.getConfig('station_name');
      if (typeof name === 'string') setStationName(name);
      apiCall(`/api/stations/${stationId}/heartbeat`, { method: 'POST' }).catch(() => {});
    } catch { /* skip */ }
  }

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const orgId = await window.electronAPI.getConfig('org_id') as string;
      const storeId = await window.electronAPI.getConfig('store_id') as string;
      if (!orgId) return;

      const params: Record<string, string> = { org_id: orgId, per_page: '50' };
      if (storeId) params.store_id = storeId;
      if (orderFilter === 'pending') params.video_status = 'none';
      if (orderFilter === 'packed') params.video_status = 'ready';

      const res = await apiCall<{ orders: Order[]; total: number }>(`/api/orders?${new URLSearchParams(params)}`);
      setOrders(res.orders ?? []);

      const todayParams = { org_id: orgId, video_status: 'ready', per_page: '1' };
      const todayRes = await apiCall<{ total: number }>(`/api/orders?${new URLSearchParams(todayParams)}`);
      setPackedToday(todayRes.total ?? 0);
    } catch {
      setStationStatus('error');
    } finally {
      setOrdersLoading(false);
    }
  }, [orderFilter]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    try {
      const orgId = await window.electronAPI.getConfig('org_id') as string;
      if (!orgId) return;
      const res = await apiCall<{ orders: Order[] }>(`/api/orders?${new URLSearchParams({ org_id: orgId, search: searchQuery, per_page: '20' })}`);
      setSearchResults(res.orders ?? []);
    } catch { /* skip */ }
  }

  function handleScan(barcode: string) {
    onStartPacking(barcode);
  }

  const videoStatusBadge = (vs: string) => {
    const colors: Record<string, string> = { none: 'bg-muted text-muted-foreground', recording: 'bg-amber-100 text-amber-800', uploading: 'bg-blue-100 text-blue-800', ready: 'bg-emerald-100 text-emerald-800', failed: 'bg-red-100 text-red-800' };
    return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[vs] ?? colors.none}`}>{vs}</span>;
  };

  return (
    <div className="flex flex-1 flex-col">
      <StatusBanner status={stationStatus} stationName={stationName || `Station ${stationId.slice(0, 8)}`} />

      <div className="flex flex-1 flex-col p-6 gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Packing Station</h1>
            <p className="text-sm text-muted-foreground mt-1">Scan a barcode or select an order below</p>
          </div>
          <ScannerInput onScan={handleScan} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Orders in Queue" value={String(orders.length)} />
          <StatCard label="Packed Today" value={String(packedToday)} />
          <StatCard label="Uploads Pending" value={String(pendingUploads)} />
          <StatCard label="Station" value={stationStatus.toUpperCase()} color={stationStatus === 'ready' ? 'text-emerald-600' : stationStatus === 'error' ? 'text-red-600' : ''} />
        </div>

        <div className="flex gap-2 border-b border-border">
          {([['orders', 'Order Queue'], ['search', 'Search'], ['uploads', 'Upload Queue']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {label}
              {key === 'uploads' && pendingUploads > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">{pendingUploads}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'orders' && (
            <div>
              <div className="flex gap-2 mb-3">
                {(['pending', 'packed', 'all'] as const).map((f) => (
                  <button key={f} onClick={() => setOrderFilter(f)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${orderFilter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {f === 'pending' ? 'Ready to Pack' : f === 'packed' ? 'Packed' : 'All'}
                  </button>
                ))}
                <button onClick={() => loadOrders()} disabled={ordersLoading} className="ml-auto rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  {ordersLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {orders.length === 0 && !ordersLoading && (
                <div className="rounded-xl border border-dashed border-border py-12 text-center">
                  <p className="text-lg text-muted-foreground">No orders in queue</p>
                  <p className="text-sm text-muted-foreground mt-1">Orders will appear here once synced from WooCommerce</p>
                </div>
              )}

              <div className="space-y-2">
                {orders.map((o) => (
                  <button key={o.id} onClick={() => onStartPacking(o.id)} className="w-full flex items-center justify-between rounded-xl border border-border p-4 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-bold">#{o.woo_order_number}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_name} — {o.status}</p>
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
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Search by order #, name, or email" className="flex-1 rounded-lg border border-border px-4 py-2 text-sm" />
                <button onClick={handleSearch} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Search</button>
              </div>
              <div className="space-y-2">
                {searchResults.map((o) => (
                  <button key={o.id} onClick={() => onStartPacking(o.id)} className="w-full flex items-center justify-between rounded-xl border border-border p-4 text-left hover:border-primary/40 transition-colors">
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

          {tab === 'uploads' && (
            <UploadQueueTab />
          )}
        </div>
      </div>
    </div>
  );
}

function UploadQueueTab() {
  const [jobs, setJobs] = useState(uploadQueue.getJobs());
  useEffect(() => uploadQueue.subscribe(setJobs), []);

  if (jobs.length === 0) return <p className="py-8 text-center text-muted-foreground">No pending uploads</p>;

  return (
    <div className="space-y-2">
      {jobs.map((j) => (
        <div key={j.id} className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium">{j.videoId.slice(0, 12)}...</p>
            <p className="text-xs text-muted-foreground">Attempt {j.attempts} — {j.status}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${j.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : j.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{j.status}</span>
            {j.status === 'failed' && (
              <button onClick={() => uploadQueue.retryFailed(j.id)} className="text-xs text-primary font-semibold hover:underline">Retry</button>
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
