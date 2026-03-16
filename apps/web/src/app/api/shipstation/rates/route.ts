import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { decrypt } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { account_id, shipment } = body;

  if (!account_id || !shipment) {
    return NextResponse.json(
      { error: 'account_id and shipment required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from('shipstation_accounts')
    .select('*')
    .eq('id', account_id)
    .single();

  if (!account)
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey)
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const apiKeyData = decrypt(account.api_key_encrypted, encryptionKey);
  const apiKey = apiKeyData.split(':')[0];
  const client = new ShipStationV2Client(apiKey);

  try {
    const rateResponse = await client.getRates({ shipment });
    return NextResponse.json(rateResponse);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to get rates', details: String(err) },
      { status: 502 }
    );
  }
}
