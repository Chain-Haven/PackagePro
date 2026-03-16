import type { V1Store, V1Order } from './types';
import { getRetryDelayMs } from './retry-utils';

export class ShipStationV1Client {
  private readonly baseUrl = 'https://ssapi.shipstation.com';
  private readonly authHeader: string;

  constructor(apiKey: string, apiSecret: string) {
    this.authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429) {
        const delayMs = getRetryDelayMs(res.headers, 5, 0);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ShipStation V1 ${method} ${path} failed: ${res.status} ${text}`);
      }

      return res.json() as Promise<T>;
    }

    throw new Error(`ShipStation V1 ${method} ${path} exhausted retry budget`);
  }

  async listStores(): Promise<V1Store[]> {
    return this.request<V1Store[]>('GET', '/stores');
  }

  async getOrder(orderId: number): Promise<V1Order> {
    return this.request<V1Order>('GET', `/orders/${orderId}`);
  }

  async listOrders(params: Record<string, string> = {}): Promise<{ orders: V1Order[] }> {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/orders${qs ? '?' + qs : ''}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listStores();
      return true;
    } catch {
      return false;
    }
  }
}
