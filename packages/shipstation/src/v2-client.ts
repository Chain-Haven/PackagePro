import { RateLimiter } from './rate-limiter';
import type {
  V2Carrier,
  V2Service,
  V2Package,
  V2LabelRequest,
  V2LabelResponse,
  V2RateResponse,
} from './types';

export class ShipStationV2Client {
  private readonly baseUrl = 'https://api.shipstation.com';
  private readonly apiKey: string;
  private readonly rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(200, `shipstation-v2:${apiKey}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await this.rateLimiter.acquire();

      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10);
        const jitter = Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000 + jitter));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ShipStation V2 ${method} ${path} failed: ${res.status} ${text}`);
      }

      return res.json() as Promise<T>;
    }

    throw new Error(`ShipStation V2 ${method} ${path} exhausted retry budget`);
  }

  async listCarriers(): Promise<{ carriers: V2Carrier[] }> {
    return this.request('GET', '/v2/carriers');
  }

  async listServices(carrierId: string): Promise<{ services: V2Service[] }> {
    return this.request('GET', `/v2/carriers/${carrierId}/services`);
  }

  async listPackages(carrierId: string): Promise<{ packages: V2Package[] }> {
    return this.request('GET', `/v2/carriers/${carrierId}/packages`);
  }

  async createLabel(labelRequest: V2LabelRequest): Promise<V2LabelResponse> {
    return this.request('POST', '/v2/labels', labelRequest);
  }

  async voidLabel(labelId: string): Promise<{ approved: boolean; message: string }> {
    return this.request('PUT', `/v2/labels/${labelId}/void`);
  }

  async getRates(
    shipmentOrId: {
      shipment_id?: string;
      shipment?: V2LabelRequest['shipment'];
      rate_options?: Record<string, unknown>;
    }
  ): Promise<V2RateResponse> {
    return this.request('POST', '/v2/rates', shipmentOrId);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.listCarriers();
      return true;
    } catch {
      return false;
    }
  }
}
