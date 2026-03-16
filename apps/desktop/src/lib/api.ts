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
    token ||
    (await getSupabase().auth.getSession()).data.session?.access_token ||
    undefined;

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
  listOrders: (params: Record<string, string>) =>
    apiCall<{ orders: unknown[]; total: number }>(`/api/orders?${new URLSearchParams(params)}`),

  lockOrder: (orderId: string, stationId: string) =>
    apiCall<{ lock_id: string; expires_at: string }>(`/api/orders/${orderId}/lock`, {
      method: 'POST',
      body: { station_id: stationId },
    }),

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
      },
    ),

  finalizeVideo: (
    videoId: string,
    metadata?: { file_size_bytes?: number; duration_seconds?: number },
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

  heartbeat: (stationId: string) =>
    apiCall(`/api/stations/${stationId}/heartbeat`, { method: 'POST' }),
};
