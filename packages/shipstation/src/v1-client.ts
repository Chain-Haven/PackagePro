import { RateLimiter } from './rate-limiter';
import type { V1Store, V1Order } from './types';

export class ShipStationV1Client {
  private readonly baseUrl = 'https://ssapi.shipstation.com';
  private readonly authHeader: string;
  private readonly rateLimiter: RateLimiter;

  constructor(apiKey: string, apiSecret: string) {
    this.authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    this.rateLimiter = new RateLimiter(40);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    await this.rateLimiter.acquire();

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.request(method, path, body);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ShipStation V1 ${method} ${path} failed: ${res.status} ${text}`);
    }

    return res.json() as Promise<T>;
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
