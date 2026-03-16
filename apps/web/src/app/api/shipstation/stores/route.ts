import { NextRequest, NextResponse } from 'next/server';
import { requireShipStationAccountAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV1Client } from '@packagepro/shipstation';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

    const { account } = await requireShipStationAccountAccess(accountId, request);
    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
    const [apiKey, apiSecret] = apiKeyData.split(':');

    const client = new ShipStationV1Client(apiKey, apiSecret);
    const stores = await client.listStores();

    return NextResponse.json({ stores });
  } catch (err) {
    return handleApiError(err);
  }
}
