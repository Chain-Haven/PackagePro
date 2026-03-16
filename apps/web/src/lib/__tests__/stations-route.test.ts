import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  requireOrgMember: vi.fn(),
  requireOrgRole: vi.fn(),
  handleApiError: vi.fn(),
  writeAuditLog: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireOrgMember: routeMocks.requireOrgMember,
  requireOrgRole: routeMocks.requireOrgRole,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: routeMocks.writeAuditLog,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

describe('stations route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.requireOrgMember.mockReset();
    routeMocks.requireOrgRole.mockReset();
    routeMocks.handleApiError.mockReset();
    routeMocks.writeAuditLog.mockReset();
    routeMocks.createAdminClient.mockReset();

    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
    routeMocks.requireOrgRole.mockResolvedValue({
      user: { id: 'user-1' },
    });
    routeMocks.writeAuditLog.mockResolvedValue(undefined);
  });

  it('reuses an existing station when machine_id already exists for the store', async () => {
    const insert = vi.fn();
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'stations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    maybeSingle: vi.fn(async () => ({
                      data: {
                        id: 'station-1',
                        name: 'Packing Bench A',
                        machine_id: 'machine-1',
                      },
                    })),
                  })),
                })),
              })),
            })),
            insert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    routeMocks.createAdminClient.mockReturnValue(admin);

    const { POST } = await import('@/app/api/stations/route');
    const request = new NextRequest('https://packagepro.test/api/stations', {
      method: 'POST',
      body: JSON.stringify({
        org_id: '11111111-1111-1111-1111-111111111111',
        store_id: '22222222-2222-2222-2222-222222222222',
        name: 'Packing Bench A',
        machine_id: 'machine-1',
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.station.id).toBe('station-1');
    expect(insert).not.toHaveBeenCalled();
  });
});
