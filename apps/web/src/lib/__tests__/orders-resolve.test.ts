import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  requireOrgMember: vi.fn(),
  handleApiError: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

vi.mock('@/lib/auth', () => ({
  requireOrgMember: routeMocks.requireOrgMember,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

function createOrderQueryBuilder() {
  const filters: Array<[string, unknown]> = [];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return builder;
    }),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => {
      const hasWooOrderNumber = filters.some(([column]) => column === 'woo_order_number');
      const hasWooOrderId = filters.some(([column]) => column === 'woo_order_id');

      if (hasWooOrderId && !hasWooOrderNumber) {
        return {
          data: {
            id: 'resolved-order',
            woo_order_id: 12345,
            woo_order_number: '1001',
          },
        };
      }

      return { data: null };
    }),
  };

  return builder;
}

describe('orders resolve route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.requireOrgMember.mockReset();
    routeMocks.createAdminClient.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.requireOrgMember.mockResolvedValue(undefined);
    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
  });

  it('uses a fresh base query for fallback scan lookups', async () => {
    const builders: Array<ReturnType<typeof createOrderQueryBuilder>> = [];
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => {
        const builder = createOrderQueryBuilder();
        builders.push(builder);
        return builder;
      }),
    });

    const { GET } = await import('@/app/api/orders/resolve/route');
    const request = new NextRequest(
      'https://packagepro.test/api/orders/resolve?org_id=org-1&scan=12345'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.id).toBe('resolved-order');
    expect(builders.length).toBeGreaterThan(1);
  });
});
