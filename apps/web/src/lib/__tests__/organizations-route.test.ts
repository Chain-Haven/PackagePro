import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getUserMemberships: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  handleApiError: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
  getUserMemberships: routeMocks.getUserMemberships,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: routeMocks.createClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: routeMocks.createAdminClient,
}));

vi.mock('@/lib/api-utils', () => ({
  handleApiError: routeMocks.handleApiError,
}));

describe('organizations route', () => {
  beforeEach(() => {
    vi.resetModules();
    routeMocks.getAuthenticatedUser.mockReset();
    routeMocks.getUserMemberships.mockReset();
    routeMocks.createClient.mockReset();
    routeMocks.createAdminClient.mockReset();
    routeMocks.handleApiError.mockReset();

    routeMocks.getAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      user_metadata: { full_name: 'Test User' },
    });
    routeMocks.handleApiError.mockImplementation((err: unknown) =>
      NextResponse.json({ error: String(err) }, { status: 500 })
    );
  });

  it('creates organizations through an admin-backed write path', async () => {
    const upsertUser = vi.fn(async () => ({ error: null }));
    const insertOrg = vi.fn(async () => ({ error: null }));
    const insertMembership = vi.fn(async () => ({ error: null }));

    routeMocks.createClient.mockImplementation(() => {
      throw new Error('createClient should not be used for write path');
    });
    routeMocks.createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return { upsert: upsertUser };
        }

        if (table === 'organizations') {
          return { insert: insertOrg };
        }

        if (table === 'memberships') {
          return { insert: insertMembership };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { POST } = await import('@/app/api/organizations/route');
    const request = new NextRequest('https://packagepro.test/api/organizations', {
      method: 'POST',
      body: JSON.stringify({ name: 'North Warehouse', slug: 'north-warehouse' }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(upsertUser).toHaveBeenCalledOnce();
    expect(insertOrg).toHaveBeenCalledOnce();
    expect(insertMembership).toHaveBeenCalledOnce();
  });
});
