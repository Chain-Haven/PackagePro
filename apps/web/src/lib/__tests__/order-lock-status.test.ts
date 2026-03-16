import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  requireOrderAccess: vi.fn(),
  requireStationAccess: vi.fn(),
  handleApiError: vi.fn(),
  writeAuditLog: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireOrderAccess: routeMocks.requireOrderAccess,
  requireStationAccess: routeMocks.requireStationAccess,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: routeMocks.writeAuditLog,
}));

vi.mock('@/lib/security', () => ({
  enforceRateLimit: routeMocks.enforceRateLimit,
}));

describe('order lock route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.requireOrderAccess.mockReset();
    routeMocks.requireStationAccess.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.writeAuditLog.mockReset();
    routeMocks.enforceRateLimit.mockReset();

    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
    routeMocks.requireOrderAccess.mockResolvedValue({
      order: { id: 'order-1', org_id: 'org-1', store_id: 'store-1' },
      user: { id: 'user-1' },
      admin: null,
    });
    routeMocks.requireStationAccess.mockResolvedValue({
      station: { id: 'station-1', org_id: 'org-1', store_id: 'store-1' },
    });
    routeMocks.writeAuditLog.mockResolvedValue(undefined);
    routeMocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it('creates a lock without setting orders.video_status to recording', async () => {
    const updateOrders = vi.fn();
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'order_locks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: null })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: { id: 'lock-1' },
                  error: null,
                })),
              })),
            })),
          };
        }

        if (table === 'orders') {
          return { update: updateOrders };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    routeMocks.requireOrderAccess.mockResolvedValue({
      order: { id: 'order-1', org_id: 'org-1', store_id: 'store-1' },
      user: { id: 'user-1' },
      admin,
    });

    const { POST } = await import('@/app/api/orders/[id]/lock/route');
    const request = new NextRequest('https://packagepro.test/api/orders/order-1/lock', {
      method: 'POST',
      body: JSON.stringify({ station_id: 'station-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'order-1' }) });

    expect(response.status).toBe(201);
    expect(updateOrders).not.toHaveBeenCalled();
  });

  it('returns 409 when the database unique constraint rejects a concurrent lock', async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'order_locks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: null })),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: null,
                  error: { code: '23505' },
                })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    routeMocks.requireOrderAccess.mockResolvedValue({
      order: { id: 'order-1', org_id: 'org-1', store_id: 'store-1' },
      user: { id: 'user-1' },
      admin,
    });

    const { POST } = await import('@/app/api/orders/[id]/lock/route');
    const request = new NextRequest('https://packagepro.test/api/orders/order-1/lock', {
      method: 'POST',
      body: JSON.stringify({ station_id: 'station-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'order-1' }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/locked/i);
  });
});
