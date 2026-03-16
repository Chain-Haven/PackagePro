import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { decrypt } from '@packagepro/shared';
import { ShipStationV1Client } from '@packagepro/shipstation';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = request.nextUrl.searchParams.get('account_id');
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: account } = await admin
    .from('shipstation_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const apiKeyData = decrypt(account.api_key_encrypted, encryptionKey);
  const [apiKey, apiSecret] = apiKeyData.split(':');

  const client = new ShipStationV1Client(apiKey, apiSecret);
  const stores = await client.listStores();

  return NextResponse.json({ stores });
}
