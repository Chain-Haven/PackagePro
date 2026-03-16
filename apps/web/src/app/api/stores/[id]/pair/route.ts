import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { encrypt } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { pairing_code, consumer_key, consumer_secret } = body;

    const admin = createAdminClient();

    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    if (!store.pairing_code || store.pairing_code.toUpperCase() !== pairing_code?.toUpperCase()) {
      return NextResponse.json({ error: 'Invalid pairing code' }, { status: 400 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { error } = await admin
      .from('stores')
      .update({
        consumer_key_encrypted: encrypt(consumer_key, encryptionKey),
        consumer_secret_encrypted: encrypt(consumer_secret, encryptionKey),
        pairing_code: null,
        paired_at: new Date().toISOString(),
        sync_status: 'synced',
      })
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: 'Failed to complete pairing' }, { status: 500 });
    }

    return NextResponse.json({ success: true, paired_at: new Date().toISOString() });
  } catch (err) {
    return handleApiError(err);
  }
}
