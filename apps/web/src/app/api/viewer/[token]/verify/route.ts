import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { hashToken, STORAGE_BUCKET, VIDEO_SIGNED_URL_EXPIRY_SECONDS } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { email, postal_code } = body;

    const tokenHash = hashToken(token);
    const admin = createAdminClient();

    const { data: accessToken } = await admin
      .from('video_access_tokens')
      .select(
        '*, videos(*), orders(woo_order_number, customer_email, shipping_address, store_id, stores(name))'
      )
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single();

    if (!accessToken || new Date(accessToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const order = accessToken.orders as Record<string, unknown>;
    const video = accessToken.videos as Record<string, unknown>;

    let verified = false;
    if (email && order.customer_email) {
      verified =
        email.toLowerCase().trim() ===
        (order.customer_email as string).toLowerCase().trim();
    }
    if (postal_code && order.shipping_address) {
      const addr = order.shipping_address as Record<string, string>;
      const orderZip = (addr.postcode || addr.postal_code || '')
        .replace(/\s/g, '')
        .toLowerCase();
      const inputZip = (postal_code as string).replace(/\s/g, '').toLowerCase();
      verified = verified || orderZip === inputZip;
    }

    await admin.from('video_access_logs').insert({
      video_id: video.id,
      token_id: accessToken.id,
      ip_address: request.headers.get('x-forwarded-for') || null,
      user_agent: request.headers.get('user-agent') || null,
      verified,
    });

    if (!verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
    }

    const { data: signedUrl } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        video.storage_path as string,
        VIDEO_SIGNED_URL_EXPIRY_SECONDS
      );

    if (!signedUrl) {
      return NextResponse.json(
        { error: 'Failed to generate playback URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      playback_url: signedUrl.signedUrl,
      order_number: order.woo_order_number,
      store_name: (order.stores as Record<string, string>)?.name || 'Store',
      recorded_at: video.ready_at,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
