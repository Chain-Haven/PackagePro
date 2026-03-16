import type {
  V2Carrier,
  V2Service,
  V2Package,
  V2LabelRequest,
  V2LabelResponse,
  V2RateResponse,
} from './types';
import { getRetryDelayMs } from './retry-utils';

export class ShipStationV2Client {
  private readonly baseUrl = 'https://api.shipstation.com';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.status === 429) {
        const jitter = Math.floor(Math.random() * 1000);
        const delayMs = getRetryDelayMs(res.headers, 5, jitter);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
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
