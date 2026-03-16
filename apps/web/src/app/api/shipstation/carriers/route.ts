import { NextRequest, NextResponse } from 'next/server';
import { requireShipStationAccountAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';

export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

    const { account } = await requireShipStationAccountAccess(accountId, request);
    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
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
