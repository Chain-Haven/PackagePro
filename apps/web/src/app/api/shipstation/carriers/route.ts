import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { decrypt } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';

export async function GET(request: NextRequest) {
  try {
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
    const apiKey = apiKeyData.split(':')[0];

    const client = new ShipStationV2Client(apiKey);

    const carrierId = request.nextUrl.searchParams.get('carrier_id');

    if (carrierId) {
      const [services, packages] = await Promise.all([
        client.listServices(carrierId),
        client.listPackages(carrierId),
      ]);
      return NextResponse.json({ services: services.services, packages: packages.packages });
    }

    const { carriers } = await client.listCarriers();
    return NextResponse.json({ carriers });
  } catch (err) {
    return handleApiError(err);
  }
}
