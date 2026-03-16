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

describe('order release route', () => {
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
      order: { id: 'order-1', org_id: 'org-1', store_id: 'store-1', video_status: 'recording' },
      user: { id: 'user-1' },
      admin: null,
    });
    routeMocks.requireStationAccess.mockResolvedValue({
      station: { id: 'station-1', org_id: 'org-1', store_id: 'store-1' },
    });
    routeMocks.writeAuditLog.mockResolvedValue(undefined);
    routeMocks.enforceRateLimit.mockResolvedValue(undefined);
  });

  it('releases the active lock for the order and station', async () => {
    const updateLocks = vi.fn(() => {
      const query = {
        eq: vi.fn(() => query),
        is: vi.fn(async () => ({ error: null })),
      };
      return query;
    });
    const updateOrders = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'order_locks') {
          return { update: updateLocks };
        }
        if (table === 'orders') {
          return { update: updateOrders };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    routeMocks.requireOrderAccess.mockResolvedValue({
      order: { id: 'order-1', org_id: 'org-1', store_id: 'store-1', video_status: 'recording' },
      user: { id: 'user-1' },
      admin,
    });

    const { POST } = await import('@/app/api/orders/[id]/release/route');
    const request = new NextRequest('https://packagepro.test/api/orders/order-1/release', {
      method: 'POST',
      body: JSON.stringify({ station_id: 'station-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const response = await POST(request, { params: Promise.resolve({ id: 'order-1' }) });

    expect(response.status).toBe(200);
    expect(updateLocks).toHaveBeenCalledOnce();
    expect(updateOrders).toHaveBeenCalledOnce();
  });
});
