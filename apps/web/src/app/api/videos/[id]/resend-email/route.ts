import { NextRequest, NextResponse } from 'next/server';
import { requireVideoAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { buildExternalUrl, getEncryptionKey } from '@/lib/security';
import { getWebAppUrl } from '@/lib/env';
import {
  DEFAULT_VIEWER_TOKEN_TTL_DAYS,
  decryptIfNeeded,
  generateHmac,
  generateToken,
  hashToken,
  VIEWER_TOKEN_BYTES,
} from '@packagepro/shared';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params;
    const {
      video: _video,
      user,
      admin,
    } = await requireVideoAccess(videoId, request, [
      'org_owner',
      'org_admin',
      'warehouse_manager',
      'support_viewer',
    ]);
    const { data: hydratedVideo } = await admin
      .from('videos')
      .select('*, orders(*, stores(*))')
      .eq('id', videoId)
      .single();

    if (!hydratedVideo || hydratedVideo.status !== 'ready') {
      return NextResponse.json({ error: 'Video not found or not ready' }, { status: 404 });
    }

    const { data: storeSettings } = await admin
      .from('store_settings')
      .select('*')
      .eq('store_id', hydratedVideo.store_id)
      .maybeSingle();

    const order = hydratedVideo.orders as Record<string, unknown>;
    const store = order?.stores as Record<string, unknown>;

    if (!store?.paired_at || !store.webhook_secret) {
      return NextResponse.json({ error: 'Store not properly connected' }, { status: 400 });
    }

    await admin
      .from('video_access_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('video_id', videoId)
      .is('revoked_at', null);

    const rawToken = generateToken(VIEWER_TOKEN_BYTES);
    const tokenHash = hashToken(rawToken);
    const tokenTtlDays = storeSettings?.viewer_token_ttl_days ?? DEFAULT_VIEWER_TOKEN_TTL_DAYS;
    const expiresAt = new Date(Date.now() + tokenTtlDays * 24 * 60 * 60 * 1000).toISOString();

    await admin.from('video_access_tokens').insert({
      video_id: videoId,
      order_id: hydratedVideo.order_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      secondary_verification: storeSettings?.require_secondary_verification ?? false,
    });

    const appUrl = getWebAppUrl();
    const viewerUrl = `${appUrl}/view/${rawToken}`;

    const emailPayload = JSON.stringify({
      woo_order_id: order.woo_order_id,
      viewer_url: viewerUrl,
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const webhookSecret = decryptIfNeeded(store.webhook_secret as string, getEncryptionKey());
    const signature = generateHmac(`${timestamp}.${emailPayload}`, webhookSecret);

    const attachPayload = JSON.stringify({
      woo_order_id: order.woo_order_id,
      video_id: videoId,
      video_status: 'ready',
      viewer_token_hash: tokenHash,
      viewer_url: viewerUrl,
    });
    const attachSignature = generateHmac(`${timestamp}.${attachPayload}`, webhookSecret);
    await fetch(
      buildExternalUrl(store.url as string, '/wp-json/packagepro/v1/attach-video', {
        allowHttpLocalhost: process.env.NODE_ENV !== 'production',
      }),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PackagePro-Signature': attachSignature,
          'X-PackagePro-Timestamp': String(timestamp),
        },
        body: attachPayload,
      }
    );

    const emailRes = await fetch(
      buildExternalUrl(store.url as string, '/wp-json/packagepro/v1/send-email', {
        allowHttpLocalhost: process.env.NODE_ENV !== 'production',
      }),
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
      order_id: hydratedVideo.order_id,
      store_id: hydratedVideo.store_id,
      type: 'packing_video_resend',
      recipient: (order.customer_email as string) || 'unknown',
      status: emailSuccess ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      error: emailSuccess ? null : `HTTP ${emailRes.status}`,
    });

    await writeAuditLog({
      admin,
      orgId: hydratedVideo.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'video_email_resent',
      resourceType: 'video',
      resourceId: videoId,
      details: { email_success: emailSuccess },
      request,
    });

    return NextResponse.json({ success: emailSuccess, viewer_url: viewerUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
