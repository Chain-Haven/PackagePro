import { NextRequest, NextResponse } from 'next/server';
import { requireShipStationAccountAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV1Client } from '@packagepro/shipstation';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

    const { account, user, admin } = await requireShipStationAccountAccess(accountId, request, [
      'org_owner',
      'org_admin',
      'warehouse_manager',
    ]);
    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
    const [apiKey, apiSecret] = apiKeyData.split(':');

    const client = new ShipStationV1Client(apiKey, apiSecret);
    const success = await client.testConnection();

    await admin
      .from('shipstation_accounts')
      .update({
        connection_status: success ? 'connected' : 'failed',
        last_tested_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    await writeAuditLog({
      admin,
      orgId: account.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'shipstation_connection_tested',
      resourceType: 'shipstation_account',
      resourceId: accountId,
      details: { success },
      request,
    });

    return NextResponse.json({ success, connection_status: success ? 'connected' : 'failed' });
  } catch (err) {
    return handleApiError(err);
  }
}
