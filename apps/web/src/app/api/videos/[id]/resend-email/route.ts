import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateToken, hashToken } from '@packagepro/shared';
import { createHmac } from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: video } = await admin
    .from('videos')
    .select('*, orders(*, stores(*))')
    .eq('id', videoId)
    .single();

  if (!video || video.status !== 'ready') {
    return NextResponse.json(
      { error: 'Video not found or not ready' },
      { status: 404 }
    );
  }

  const order = video.orders as Record<string, unknown>;
  const store = order?.stores as Record<string, unknown>;

  if (!store?.paired_at || !store.webhook_secret) {
    return NextResponse.json(
      { error: 'Store not properly connected' },
      { status: 400 }
    );
  }

  // Generate new access token
  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from('video_access_tokens').insert({
    video_id: videoId,
    order_id: video.order_id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const viewerUrl = `${appUrl}/view/${rawToken}`;

  // Trigger email via WooCommerce plugin
  const emailPayload = JSON.stringify({
    woo_order_id: order.woo_order_id,
    viewer_url: viewerUrl,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', store.webhook_secret as string)
    .update(`${timestamp}.${emailPayload}`)
    .digest('hex');

  const emailRes = await fetch(
    `${store.url}/wp-json/packagepro/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PackagePro-Signature': signature,
        'X-PackagePro-Timestamp': String(timestamp),
      },
      body: emailPayload,
    }
  );

  const emailSuccess = emailRes.ok;

  await admin.from('email_events').insert({
    order_id: video.order_id,
    store_id: video.store_id,
    type: 'packing_video_resend',
    recipient: (order.customer_email as string) || 'unknown',
    status: emailSuccess ? 'sent' : 'failed',
    sent_at: new Date().toISOString(),
    error: emailSuccess ? null : `HTTP ${emailRes.status}`,
  });

  await admin.from('audit_logs').insert({
    org_id: video.org_id,
    actor_id: user.id,
    actor_type: 'user',
    action: 'email_resent',
    resource_type: 'video',
    resource_id: videoId,
  });

  return NextResponse.json({ success: emailSuccess, viewer_url: viewerUrl });
}
