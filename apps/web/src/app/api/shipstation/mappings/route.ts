import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireOrgMember,
  requireOrgRole,
  requireShipStationAccountAccess,
  requireStoreAccess,
} from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const CreateMappingSchema = z.object({
  store_id: z.string().uuid(),
  shipstation_account_id: z.string().uuid(),
  shipstation_store_id: z.string().min(1),
  shipstation_store_name: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();
    const { data: mappings } = await admin
      .from('shipstation_store_mappings')
      .select('*, stores(id, name), shipstation_accounts(id, label, connection_status)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ mappings: mappings ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateMappingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { store, user, admin } = await requireStoreAccess(parsed.data.store_id, request, [
      'org_owner',
      'org_admin',
    ]);
    const { account } = await requireShipStationAccountAccess(
      parsed.data.shipstation_account_id,
      request,
      ['org_owner', 'org_admin']
    );

    if (store.org_id !== account.org_id) {
      return NextResponse.json(
        { error: 'Store and ShipStation account must belong to the same organization' },
        { status: 409 }
      );
    }

    await admin
      .from('shipstation_store_mappings')
      .delete()
      .eq('store_id', parsed.data.store_id);

    const { data: mapping, error } = await admin
      .from('shipstation_store_mappings')
      .insert({
        org_id: store.org_id,
        store_id: parsed.data.store_id,
        shipstation_account_id: parsed.data.shipstation_account_id,
        shipstation_store_id: parsed.data.shipstation_store_id,
        shipstation_store_name: parsed.data.shipstation_store_name || null,
      })
      .select('*, stores(id, name), shipstation_accounts(id, label, connection_status)')
      .single();

    if (error || !mapping) {
      return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: store.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'shipstation_mapping_saved',
      resourceType: 'store',
      resourceId: parsed.data.store_id,
      details: {
        shipstation_account_id: parsed.data.shipstation_account_id,
        shipstation_store_id: parsed.data.shipstation_store_id,
      },
      request,
    });

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
