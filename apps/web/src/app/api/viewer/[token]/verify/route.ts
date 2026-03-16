import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestIp, handleApiError } from '@/lib/api-utils';
import { enforceRateLimit } from '@/lib/security';
import { verifyViewerAccess } from '@/lib/viewer-verification';
import {
  hashToken,
  STORAGE_BUCKET,
  VIDEO_SIGNED_URL_EXPIRY_SECONDS,
  VIEWER_RATE_LIMIT_PER_MIN,
  ViewerVerifyRequestSchema,
} from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await enforceRateLimit(request, 'viewer-token-verify', token, VIEWER_RATE_LIMIT_PER_MIN, 60);
    const body = await request.json();
    const parsedBody = ViewerVerifyRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }
    const { email, postal_code } = parsedBody.data;

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

    const addr = order.shipping_address as Record<string, string> | undefined;
    const orderZip = addr ? (addr.postcode || addr.postal_code || '') : '';
    const verified = verifyViewerAccess({
      email,
      postalCode: postal_code,
      orderEmail: (order.customer_email as string | null) || null,
      orderZip,
    });

    await admin.from('video_access_logs').insert({
      video_id: video.id,
      token_id: accessToken.id,
      ip_address: getRequestIp(request),
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
