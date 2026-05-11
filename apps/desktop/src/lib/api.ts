import { getBackendUrl, getSupabase } from './supabase';

async function getApiBase(): Promise<string> {
  if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
    const url = await window.electronAPI.getConfig('backend_url');
    if (typeof url === 'string' && url) return url;
  }
  return getBackendUrl();
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiCall<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const API_BASE = await getApiBase();
  const sessionToken =
    token || (await getSupabase().auth.getSession()).data.session?.access_token || undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((error as { error?: string }).error || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  getHealth: () =>
    apiCall<{
      status: 'ok' | 'degraded';
      checks: { supabase: 'ok' | 'error'; cron: 'configured' | 'missing' };
      timestamp: string;
    }>('/api/health'),

  getOperationalHealth: (orgId: string) =>
    apiCall<{
      status: 'ok' | 'warning' | 'error';
      checks: Array<{
        code: string;
        label: string;
        status: 'ok' | 'warning' | 'error';
        message: string;
        fix: string;
        autoFixAvailable: boolean;
      }>;
      timestamp: string;
    }>(`/api/admin/health?${new URLSearchParams({ org_id: orgId })}`),

  runOperationalSelfHeal: (orgId: string) =>
    apiCall<{
      success: boolean;
      result: {
        expiredLocksReleased: number;
        offlineStationsUpdated: number;
        stuckUploadsFailed: number;
        timestamp: string;
      };
    }>('/api/admin/self-heal', {
      method: 'POST',
      body: { org_id: orgId },
    }),

  listOrganizations: () =>
    apiCall<{ organizations: Array<{ id: string; name: string; slug: string; role: string }> }>(
      '/api/organizations'
    ),

  createOrganization: (body: { name: string; slug: string }) =>
    apiCall<{ organization: { id: string; name: string; slug: string } }>('/api/organizations', {
      method: 'POST',
      body,
    }),

  listStores: (orgId: string) =>
    apiCall<{
      stores: Array<{
        id: string;
        name: string;
        url: string;
        paired_at?: string | null;
        sync_status?: string | null;
      }>;
    }>(`/api/stores?${new URLSearchParams({ org_id: orgId })}`),

  listStations: (orgId: string) =>
    apiCall<{
      stations: Array<{
        id: string;
        store_id: string;
        name: string;
        machine_id?: string | null;
        status?: string | null;
      }>;
    }>(`/api/stations?${new URLSearchParams({ org_id: orgId })}`),

  createStore: (body: { org_id: string; name: string; url: string }) =>
    apiCall<{
      store: {
        id: string;
        name: string;
        url: string;
        paired_at?: string | null;
        sync_status?: string | null;
      };
    }>('/api/stores', {
      method: 'POST',
      body,
    }),

  pairStore: (storeId: string, pairingCode: string) =>
    apiCall<{ success: boolean; paired_at?: string; store_name?: string }>(
      `/api/stores/${storeId}/pair`,
      {
        method: 'POST',
        body: { pairing_code: pairingCode },
      }
    ),

  registerStation: (body: {
    org_id: string;
    store_id: string;
    name: string;
    machine_id?: string;
  }) =>
    apiCall<{ station: { id: string; name: string } }>('/api/stations', {
      method: 'POST',
      body,
    }),

  listOrders: (params: Record<string, string>) =>
    apiCall<{ orders: unknown[]; total: number }>(`/api/orders?${new URLSearchParams(params)}`),

  getOrder: (orderId: string) => apiCall<{ order: unknown }>(`/api/orders/${orderId}`),

  resolveOrder: (params: Record<string, string>) =>
    apiCall<{ order: unknown }>(`/api/orders/resolve?${new URLSearchParams(params)}`),

  lockOrder: (orderId: string, stationId: string) =>
    apiCall<{ lock_id: string; expires_at: string }>(`/api/orders/${orderId}/lock`, {
      method: 'POST',
      body: { station_id: stationId },
    }),

  heartbeat: (stationId: string) =>
    apiCall(`/api/stations/${stationId}/heartbeat`, { method: 'POST' }),

  releaseOrder: (orderId: string, stationId: string) =>
    apiCall(`/api/orders/${orderId}/release`, {
      method: 'POST',
      body: { station_id: stationId },
    }),

  requestUploadUrl: (orderId: string, stationId: string) =>
    apiCall<{ video_id: string; upload_url: string; storage_path: string; token: string }>(
      '/api/videos/upload-url',
      {
        method: 'POST',
        body: {
          order_id: orderId,
          station_id: stationId,
          file_name: 'recording.webm',
          content_type: 'video/webm',
        },
      }
    ),

  refreshUploadUrl: (videoId: string) =>
    apiCall<{ video_id: string; upload_url: string; storage_path: string; token: string }>(
      `/api/videos/${videoId}/refresh-upload-url`,
      {
        method: 'POST',
      }
    ),

  finalizeVideo: (
    videoId: string,
    metadata?: { file_size_bytes?: number; duration_seconds?: number }
  ) =>
    apiCall(`/api/videos/${videoId}/finalize`, {
      method: 'POST',
      body: metadata || {},
    }),

  getCarriers: (accountId: string) =>
    apiCall<{ carriers: unknown[] }>(`/api/shipstation/carriers?account_id=${accountId}`),

  createLabel: (body: unknown) =>
    apiCall<{
      label_id: string;
      tracking_number: string;
      label_download_url: string;
      shipment_cost: number;
    }>('/api/shipstation/labels', { method: 'POST', body }),
};
