import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  handleApiError: vi.fn(),
  enforceRateLimit: vi.fn(),
  getEncryptionKey: vi.fn(),
  decryptIfNeeded: vi.fn(),
  verifyHmac: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

vi.mock('@/lib/security', () => ({
  enforceRateLimit: routeMocks.enforceRateLimit,
  getEncryptionKey: routeMocks.getEncryptionKey,
}));

vi.mock('@packagepro/shared', async () => {
  const actual = await vi.importActual<typeof import('@packagepro/shared')>('@packagepro/shared');
  return {
    ...actual,
    decryptIfNeeded: routeMocks.decryptIfNeeded,
    verifyHmac: routeMocks.verifyHmac,
  };
});

function createWebhookDeliveryTable() {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { id: 'delivery-1' } })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  };
}

describe('orders reconcile route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.createAdminClient.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.enforceRateLimit.mockReset();
    routeMocks.getEncryptionKey.mockReset();
    routeMocks.decryptIfNeeded.mockReset();
    routeMocks.verifyHmac.mockReset();

    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
    routeMocks.enforceRateLimit.mockResolvedValue(undefined);
    routeMocks.getEncryptionKey.mockReturnValue('test-key');
    routeMocks.decryptIfNeeded.mockImplementation((value: string) => value);
    routeMocks.verifyHmac.mockReturnValue(true);
  });

  it('bulk upserts reconciled orders in one call', async () => {
    const storeId = '11111111-1111-1111-1111-111111111111';
    const upsert = vi.fn(async () => ({ error: null }));
    const webhookDeliveries = createWebhookDeliveryTable();

    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'stores') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: storeId,
                    org_id: 'org-1',
                    webhook_secret: 'plain-secret',
                  },
                })),
              })),
            })),
          };
        }

        if (table === 'webhook_deliveries') {
          return webhookDeliveries;
        }

        if (table === 'orders') {
          return { upsert };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { POST } = await import('@/app/api/webhooks/woo/[storeId]/reconcile/route');
    const payload = {
      store_id: storeId,
      orders: [
        { id: 101, number: '101', status: 'processing' },
        { id: 102, number: '102', status: 'pending' },
      ],
    };
    const request = new NextRequest(
      `https://packagepro.test/api/webhooks/woo/${storeId}/reconcile`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'X-PackagePro-Signature': 'valid-signature',
          'X-PackagePro-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ storeId }),
    });

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ woo_order_id: 101 }),
        expect.objectContaining({ woo_order_id: 102 }),
      ]),
      { onConflict: 'store_id,woo_order_id' }
    );
  });
});
