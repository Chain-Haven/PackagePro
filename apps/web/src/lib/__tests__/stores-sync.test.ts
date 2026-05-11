import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  requireStoreAccess: vi.fn(),
  handleApiError: vi.fn(),
  writeAuditLog: vi.fn(),
  buildExternalUrl: vi.fn(),
  enforceRateLimit: vi.fn(),
  getEncryptionKey: vi.fn(),
  decryptIfNeeded: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireStoreAccess: routeMocks.requireStoreAccess,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: routeMocks.writeAuditLog,
}));

vi.mock('@/lib/security', () => ({
  buildExternalUrl: routeMocks.buildExternalUrl,
  enforceRateLimit: routeMocks.enforceRateLimit,
  getEncryptionKey: routeMocks.getEncryptionKey,
}));

vi.mock('@packagepro/shared', async () => {
  const actual = await vi.importActual<typeof import('@packagepro/shared')>('@packagepro/shared');
  return {
    ...actual,
    decryptIfNeeded: routeMocks.decryptIfNeeded,
  };
});

describe('store sync route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.requireStoreAccess.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.writeAuditLog.mockReset();
    routeMocks.buildExternalUrl.mockReset();
    routeMocks.enforceRateLimit.mockReset();
    routeMocks.getEncryptionKey.mockReset();
    routeMocks.decryptIfNeeded.mockReset();

    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
    routeMocks.requireStoreAccess.mockResolvedValue({
      store: {
        id: 'store-1',
        org_id: 'org-1',
        paired_at: new Date().toISOString(),
        consumer_key_encrypted: 'key',
        consumer_secret_encrypted: 'secret',
        url: 'https://store.example',
      },
      user: { id: 'user-1' },
      admin: {
        from: vi.fn(),
      },
    });
    routeMocks.buildExternalUrl.mockReturnValue('https://store.example/wp-json/wc/v3/orders');
    routeMocks.enforceRateLimit.mockResolvedValue(undefined);
    routeMocks.getEncryptionKey.mockReturnValue('test-key');
    routeMocks.decryptIfNeeded.mockImplementation((value: string) => value);
    routeMocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it('bulk upserts synced WooCommerce orders in a single batch', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const updateStore = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'stores') {
          return { update: updateStore };
        }

        if (table === 'orders') {
          return { upsert };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    routeMocks.requireStoreAccess.mockResolvedValue({
      store: {
        id: 'store-1',
        org_id: 'org-1',
        paired_at: new Date().toISOString(),
        consumer_key_encrypted: 'key',
        consumer_secret_encrypted: 'secret',
        url: 'https://store.example',
      },
      user: { id: 'user-1' },
      admin,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 101,
            number: '101',
            status: 'processing',
            billing: {},
            shipping: {},
            line_items: [],
            total: '10.00',
          },
          {
            id: 102,
            number: '102',
            status: 'pending',
            billing: {},
            shipping: {},
            line_items: [],
            total: '20.00',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/stores/[id]/sync/route');
    const request = new NextRequest('https://packagepro.test/api/stores/store-1/sync', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'store-1' }) });

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
