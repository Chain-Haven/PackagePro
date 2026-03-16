import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { decrypt } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: labelId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { account_id } = body;

    if (!account_id)
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });

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

    const result = await client.voidLabel(labelId);

    await admin.from('audit_logs').insert({
      org_id: account.org_id,
      actor_id: user.id,
      actor_type: 'user',
      action: 'label_voided',
      resource_type: 'label',
      resource_id: labelId,
      details: result,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
