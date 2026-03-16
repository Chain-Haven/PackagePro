import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgMember, requireOrgRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { normalizeExternalUrl } from '@/lib/security';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { generatePairingCode } from '@packagepro/shared';

const CreateStoreSchema = z.object({
  org_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();

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
    const body = await request.json();
    const parsed = CreateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const normalizedUrl = normalizeExternalUrl(parsed.data.url, {
      allowHttpLocalhost: process.env.NODE_ENV !== 'production',
      requirePathlessBase: true,
    });
    const { user } = await requireOrgRole(
      parsed.data.org_id,
      ['org_owner', 'org_admin'],
      request
    );
    const admin = createAdminClient();

    const pairingCode = generatePairingCode();

    const { data: store, error } = await admin
      .from('stores')
      .insert({
        org_id: parsed.data.org_id,
        name: parsed.data.name,
        url: normalizedUrl,
        pairing_code: pairingCode,
      })
      .select('id, org_id, name, url, pairing_code, paired_at, sync_status, last_sync_at, settings, created_at')
      .single();

    if (error || !store) {
      return NextResponse.json({ error: 'Failed to create store' }, { status: 500 });
    }

    const { error: settingsError } = await admin
      .from('store_settings')
      .insert({ store_id: store.id });
    if (settingsError) {
      return NextResponse.json({ error: 'Failed to initialize store settings' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: parsed.data.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'store_created',
      resourceType: 'store',
      resourceId: store.id,
      details: { store_name: store.name, store_url: store.url },
      request,
    });

    return NextResponse.json({
      store,
      pairing_code: pairingCode,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
