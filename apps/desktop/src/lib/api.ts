const DEFAULT_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3000';

async function getApiBase(): Promise<string> {
  if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
    const url = await window.electronAPI.getConfig('backend_url');
    if (typeof url === 'string' && url) return url;
  }
  return DEFAULT_API_BASE;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

export async function apiCall<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const API_BASE = await getApiBase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
  // Orders
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

  // Videos
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

  finalizeVideo: (
    videoId: string,
    metadata?: { file_size_bytes?: number; duration_seconds?: number }
  ) =>
    apiCall(`/api/videos/${videoId}/finalize`, {
      method: 'POST',
      body: metadata || {},
    }),

  // ShipStation
  getCarriers: (accountId: string) =>
    apiCall<{ carriers: unknown[] }>(`/api/shipstation/carriers?account_id=${accountId}`),

  getServices: (accountId: string, carrierId: string) =>
    apiCall<{ services: unknown[]; packages: unknown[] }>(
      `/api/shipstation/carriers?account_id=${accountId}&carrier_id=${carrierId}`
    ),

  createLabel: (body: unknown) =>
    apiCall<{
      label_id: string;
      tracking_number: string;
      label_download_url: string;
      shipment_cost: number;
    }>('/api/shipstation/labels', { method: 'POST', body }),

  // Stations
  heartbeat: (stationId: string) =>
    apiCall(`/api/stations/${stationId}/heartbeat`, { method: 'POST' }),
};
