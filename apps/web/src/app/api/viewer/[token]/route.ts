import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestIp, handleApiError } from '@/lib/api-utils';
import { enforceRateLimit } from '@/lib/security';
import {
  hashToken,
  STORAGE_BUCKET,
  VIDEO_SIGNED_URL_EXPIRY_SECONDS,
  VIEWER_RATE_LIMIT_PER_MIN,
} from '@packagepro/shared';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    await enforceRateLimit(request, 'viewer-token', token, VIEWER_RATE_LIMIT_PER_MIN, 60);

    const tokenHash = hashToken(token);
    const admin = createAdminClient();

    const { data: accessToken } = await admin
      .from('video_access_tokens')
      .select('*, videos(*), orders(woo_order_number, customer_email, store_id, stores(name, url))')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .single();

    if (!accessToken) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    if (new Date(accessToken.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 410 });
    }

    const video = accessToken.videos as Record<string, unknown>;
    const order = accessToken.orders as Record<string, unknown>;

    if (!video || video.status !== 'ready') {
      return NextResponse.json({ error: 'Video not available' }, { status: 404 });
    }

    if (accessToken.secondary_verification) {
      return NextResponse.json({
        requires_verification: true,
        order_number: order?.woo_order_number,
        store_name: (order?.stores as Record<string, string>)?.name || 'Store',
      });
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

    await admin.from('video_access_logs').insert({
      video_id: video.id,
      token_id: accessToken.id,
      ip_address: getRequestIp(request),
      user_agent: request.headers.get('user-agent') || null,
      verified: true,
    });

    const response = NextResponse.json({
      playback_url: signedUrl.signedUrl,
      order_number: order?.woo_order_number,
      store_name: (order?.stores as Record<string, string>)?.name || 'Store',
      recorded_at: video.ready_at,
      requires_verification: false,
    });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
