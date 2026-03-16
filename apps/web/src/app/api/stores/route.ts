import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { z } from 'zod';
import { generatePairingCode, generateToken } from '@packagepro/shared';

const CreateStoreSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    const admin = createAdminClient();

    const { data: membership } = await admin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single();

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: stores } = await admin
      .from('stores')
      .select('id, org_id, name, url, paired_at, sync_status, last_sync_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ stores: stores ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
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

    const pairingCode = generatePairingCode();
    const webhookSecret = generateToken(32);

    const { data: store, error } = await admin
      .from('stores')
      .insert({
        org_id: parsed.data.org_id,
        name: parsed.data.name,
        url: parsed.data.url,
        pairing_code: pairingCode,
        webhook_secret: webhookSecret,
      })
      .select()
      .single();

    if (error || !store) {
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
    }

    await admin.from('store_settings').insert({ store_id: store.id });

    return NextResponse.json({
      store: {
        ...store,
        consumer_key_encrypted: undefined,
        consumer_secret_encrypted: undefined,
      },
      pairing_code: pairingCode,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
