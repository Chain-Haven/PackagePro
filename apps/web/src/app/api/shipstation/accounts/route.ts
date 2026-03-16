import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { encrypt } from '@packagepro/shared';
import { z } from 'zod';

const CreateAccountSchema = z.object({
  org_id: z.string().uuid(),
  label: z.string().min(1).max(255),
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId)
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (!membership)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: accounts } = await admin
      .from('shipstation_accounts')
      .select('id, org_id, label, connection_status, last_tested_at, created_at')
      .eq('org_id', orgId);

    return NextResponse.json({ accounts: accounts ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', parsed.data.org_id)
      .single();

    if (!membership || !['org_owner', 'org_admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey)
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const encrypted = encrypt(
      `${parsed.data.api_key}:${parsed.data.api_secret}`,
      encryptionKey
    );

    const { data: account, error } = await admin
      .from('shipstation_accounts')
      .insert({
        org_id: parsed.data.org_id,
        label: parsed.data.label,
        api_key_encrypted: encrypted,
        connection_status: 'untested',
      })
      .select('id, org_id, label, connection_status, created_at')
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
