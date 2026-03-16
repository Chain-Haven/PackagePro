import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { generateToken, hashToken, generateHmac } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: video, error } = await admin
    .from('videos')
    .update({
      status: 'ready',
      ready_at: new Date().toISOString(),
      uploaded_at: new Date().toISOString(),
      file_size_bytes: body.file_size_bytes || null,
      duration_seconds: body.duration_seconds || null,
      resolution: body.resolution || null,
    })
    .eq('id', videoId)
    .select('*, orders(*)')
    .single();

  if (error || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  await admin
    .from('uploads')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('video_id', videoId);

  await admin.from('orders').update({ video_status: 'ready' }).eq('id', video.order_id);

  const rawToken = generateToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  await admin.from('video_access_tokens').insert({
    video_id: videoId,
    order_id: video.order_id,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  await admin
    .from('order_locks')
    .update({ released_at: new Date().toISOString() })
    .eq('order_id', video.order_id)
    .is('released_at', null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const viewerUrl = `${appUrl}/view/${rawToken}`;

  const order = video.orders as any;
  if (order) {
    const { data: store } = await admin.from('stores').select('*').eq('id', video.store_id).single();

    if (store?.paired_at && store.url && store.webhook_secret) {
      const timestamp = Math.floor(Date.now() / 1000);

      const attachPayload = JSON.stringify({
        woo_order_id: order.woo_order_id,
        video_id: videoId,
        video_status: 'ready',
        recorded_at: video.ready_at,
        viewer_token_hash: tokenHash,
      });
      const attachSignature = generateHmac(`${timestamp}.${attachPayload}`, store.webhook_secret);

      fetch(`${store.url}/wp-json/packagepro/v1/attach-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PackagePro-Signature': attachSignature,
          'X-PackagePro-Timestamp': String(timestamp),
        },
        body: attachPayload,
      }).catch(() => {});

      const emailPayload = JSON.stringify({
        woo_order_id: order.woo_order_id,
        viewer_url: viewerUrl,
      });
      const emailSignature = generateHmac(`${timestamp}.${emailPayload}`, store.webhook_secret);

      fetch(`${store.url}/wp-json/packagepro/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PackagePro-Signature': emailSignature,
          'X-PackagePro-Timestamp': String(timestamp),
        },
        body: emailPayload,
      }).catch(() => {});

      await admin.from('email_events').insert({
        order_id: video.order_id,
        store_id: video.store_id,
        type: 'packing_video_ready',
        recipient: order.customer_email || 'unknown',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({
    success: true,
    video_id: videoId,
    viewer_url: viewerUrl,
    status: 'ready',
  });
}
