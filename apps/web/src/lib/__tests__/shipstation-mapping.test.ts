import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  requireOrderAccess: vi.fn(),
  requireStoreAccess: vi.fn(),
  requireShipStationAccountAccess: vi.fn(),
  handleApiError: vi.fn(),
  writeAuditLog: vi.fn(),
  getEncryptionKey: vi.fn(),
  decryptIfNeeded: vi.fn(),
  createLabel: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

vi.mock('@/lib/auth', () => ({
  requireOrderAccess: routeMocks.requireOrderAccess,
  requireStoreAccess: routeMocks.requireStoreAccess,
  requireShipStationAccountAccess: routeMocks.requireShipStationAccountAccess,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: routeMocks.writeAuditLog,
}));

vi.mock('@/lib/security', () => ({
  getEncryptionKey: routeMocks.getEncryptionKey,
}));

vi.mock('@packagepro/shared', async () => {
  const actual = await vi.importActual<typeof import('@packagepro/shared')>('@packagepro/shared');
  return {
    ...actual,
    decryptIfNeeded: routeMocks.decryptIfNeeded,
  };
});

vi.mock('@packagepro/shipstation', () => ({
  ShipStationV2Client: vi.fn().mockImplementation(() => ({
    createLabel: routeMocks.createLabel,
  })),
}));

describe('ShipStation routing', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.createAdminClient.mockReset();
    routeMocks.requireOrderAccess.mockReset();
    routeMocks.requireStoreAccess.mockReset();
    routeMocks.requireShipStationAccountAccess.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.writeAuditLog.mockReset();
    routeMocks.getEncryptionKey.mockReset();
    routeMocks.decryptIfNeeded.mockReset();
    routeMocks.createLabel.mockReset();

    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
    routeMocks.writeAuditLog.mockResolvedValue(undefined);
    routeMocks.getEncryptionKey.mockReturnValue('test-key');
    routeMocks.decryptIfNeeded.mockImplementation((value: string) => value);
    routeMocks.createLabel.mockResolvedValue({
      label_id: 'label-1',
      tracking_number: 'TRACK123',
      label_download: { pdf: 'https://labels.example/label-1.pdf' },
      shipment_cost: { amount: 9.99, currency: 'USD' },
      status: 'created',
    });
  });

  it('creates labels with the requested mapped ShipStation account', async () => {
    const orderId = '11111111-1111-1111-1111-111111111111';
    const storeId = '22222222-2222-2222-2222-222222222222';
    const accountIdOne = '33333333-3333-3333-3333-333333333333';
    const accountIdTwo = '44444444-4444-4444-4444-444444444444';
    const insertLabel = vi.fn(async () => ({ error: null }));
    const updateOrder = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));

    routeMocks.requireOrderAccess.mockResolvedValue({
      order: { id: orderId, org_id: 'org-1', store_id: storeId },
      user: { id: 'user-1' },
    });
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: orderId,
                    customer_name: 'Customer',
                    shipping_address: {},
                    stores: {
                      shipstation_store_mappings: [
                        {
                          shipstation_account_id: accountIdOne,
                          shipstation_store_id: 'ship-store-1',
                          shipstation_accounts: {
                            id: accountIdOne,
                            api_key_encrypted: 'api-key-1:secret-1',
                          },
                        },
                        {
                          shipstation_account_id: accountIdTwo,
                          shipstation_store_id: 'ship-store-2',
                          shipstation_accounts: {
                            id: accountIdTwo,
                            api_key_encrypted: 'api-key-2:secret-2',
                          },
                        },
                      ],
                    },
                  },
                })),
              })),
            })),
            update: updateOrder,
          };
        }

        if (table === 'shipping_labels') {
          return {
            insert: insertLabel,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { POST } = await import('@/app/api/shipstation/labels/route');
    const request = new NextRequest('https://packagepro.test/api/shipstation/labels', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        account_id: accountIdTwo,
        carrier_id: 'carrier-1',
        service_code: 'service-1',
        ship_from: {
          name: 'Warehouse',
          address_line1: '123 Main St',
          city_locality: 'Boise',
          state_province: 'ID',
          postal_code: '83701',
          country_code: 'US',
        },
        packages: [{ weight: { value: 16, unit: 'ounce' } }],
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.label_id).toBe('label-1');
    expect(insertLabel).toHaveBeenCalledWith(
      expect.objectContaining({
        shipstation_account_id: accountIdTwo,
      })
    );
  });

  it('preserves existing mappings for other ShipStation accounts on the same store', async () => {
    const storeId = '55555555-5555-5555-5555-555555555555';
    const accountId = '66666666-6666-6666-6666-666666666666';
    const deleteMappings = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
    const insertMapping = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: 'mapping-2',
            store_id: storeId,
            shipstation_account_id: accountId,
            shipstation_store_id: 'ship-store-2',
          },
        })),
      })),
    }));

    const mappingTable = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null })),
          })),
        })),
      })),
      delete: deleteMappings,
      insert: insertMapping,
    };

    routeMocks.requireStoreAccess.mockResolvedValue({
      store: { id: storeId, org_id: 'org-1' },
      user: { id: 'user-1' },
      admin: {
        from: vi.fn((table: string) => {
          if (table === 'shipstation_store_mappings') {
            return mappingTable;
          }

          throw new Error(`Unexpected table ${table}`);
        }),
      },
    });
    routeMocks.requireShipStationAccountAccess.mockResolvedValue({
      account: { id: accountId, org_id: 'org-1' },
    });

    const { POST } = await import('@/app/api/shipstation/mappings/route');
    const request = new NextRequest('https://packagepro.test/api/shipstation/mappings', {
      method: 'POST',
      body: JSON.stringify({
        store_id: storeId,
        shipstation_account_id: accountId,
        shipstation_store_id: 'ship-store-2',
        shipstation_store_name: 'Ship Store 2',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(deleteMappings).not.toHaveBeenCalled();
    expect(insertMapping).toHaveBeenCalled();
  });
});
