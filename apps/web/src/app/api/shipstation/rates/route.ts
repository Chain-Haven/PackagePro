import { NextRequest, NextResponse } from 'next/server';
import { requireShipStationAccountAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';
import { z } from 'zod';

const GetRatesSchema = z.object({
  account_id: z.string().uuid(),
  shipment: z.object({
    carrier_id: z.string().optional(),
    ship_to: z.record(z.unknown()),
    ship_from: z.record(z.unknown()),
    packages: z.array(z.record(z.unknown())).min(1),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GetRatesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { account } = await requireShipStationAccountAccess(parsed.data.account_id, request);
    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
    const apiKey = apiKeyData.split(':')[0];
    const client = new ShipStationV2Client(apiKey);

    const rateResponse = await client.getRates({ shipment: parsed.data.shipment as any });
    return NextResponse.json(rateResponse);
  } catch (err) {
    return handleApiError(err);
  }
}
