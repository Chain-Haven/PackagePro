import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrderAccess, requireShipStationAccountAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';

async function handleVoid(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labelId } = await params;
    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();
    let accountId: string | null = body?.account_id ?? null;
    let account: Record<string, any> | null = null;
    let actorUserId: string | null = null;
    let orgId: string | null = null;

    if (accountId) {
      const access = await requireShipStationAccountAccess(accountId, request, [
        'org_owner',
        'org_admin',
        'warehouse_manager',
      ]);
      account = access.account as Record<string, any>;
      actorUserId = access.user.id;
      orgId = account.org_id as string;
    } else {
      const { data: order } = await admin
        .from('orders')
        .select('id, org_id, stores(*, shipstation_store_mappings(*, shipstation_accounts(*)))')
        .eq('shipstation_order_id', labelId)
        .maybeSingle();

      if (!order) {
        return NextResponse.json({ error: 'account_id required' }, { status: 400 });
      }

      const access = await requireOrderAccess(order.id as string, request, [
        'org_owner',
        'org_admin',
        'warehouse_manager',
      ]);
      actorUserId = access.user.id;
      orgId = access.order.org_id;

      const store = order.stores as Record<string, any> | null;
      const mapping = store?.shipstation_store_mappings?.[0];
      account = mapping?.shipstation_accounts ?? null;
      accountId = account?.id ?? null;
    }

    if (!account)
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
    const apiKey = apiKeyData.split(':')[0];
    const client = new ShipStationV2Client(apiKey);

    const result = await client.voidLabel(labelId);

    await admin
      .from('shipping_labels')
      .update({
        status: result.approved ? 'voided' : 'void_failed',
        voided_at: result.approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('external_label_id', labelId);

    if (result.approved) {
      await admin
        .from('orders')
        .update({ shipment_status: 'voided' })
        .eq('shipstation_order_id', labelId);
    }

    await writeAuditLog({
      admin,
      orgId,
      actorId: actorUserId,
      actorType: 'user',
      action: 'label_voided',
      resourceType: 'label',
      resourceId: labelId,
      details: { ...result, account_id: accountId },
      request,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVoid(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleVoid(request, context);
}
