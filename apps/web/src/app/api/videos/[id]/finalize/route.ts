import { NextRequest, NextResponse } from 'next/server';
import { requireVideoAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { buildExternalUrl, getEncryptionKey } from '@/lib/security';
import { fetchWithTimeout } from '@/lib/videos/fetch-with-timeout';
import { getWebAppUrl } from '@/lib/env';
import {
  DEFAULT_VIEWER_TOKEN_TTL_DAYS,
  FinalizeVideoRequestSchema,
  generateToken,
  hashToken,
  generateHmac,
  STORAGE_BUCKET,
  VIEWER_TOKEN_BYTES,
  decryptIfNeeded,
} from '@packagepro/shared';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: videoId } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = FinalizeVideoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { video: existingVideo, user, admin } = await requireVideoAccess(videoId, request);
    const { data: videoRecord, error: videoLoadError } = await admin
      .from('videos')
      .select('*, orders(*), stations(name), stores(*)')
      .eq('id', videoId)
      .single();

    if (videoLoadError || !videoRecord) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (existingVideo.status === 'ready') {
      return NextResponse.json({
        success: true,
        video_id: videoId,
        status: 'ready',
      });
    }

    const pathParts = videoRecord.storage_path.split('/');
    const fileName = pathParts.pop() ?? '';
    const folderPath = pathParts.join('/');
    const { data: storedFiles } = await admin.storage
      .from(STORAGE_BUCKET)
      .list(folderPath, { search: fileName });

    if (!storedFiles?.some((file) => file.name === fileName)) {
      return NextResponse.json(
        { error: 'Uploaded video file not found in storage' },
        { status: 409 }
      );
    }

    const { data: latestUpload } = await admin
      .from('uploads')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestUpload) {
      return NextResponse.json({ error: 'Upload record not found' }, { status: 409 });
    }

    const { data: storeSettings } = await admin
      .from('store_settings')
      .select('*')
      .eq('store_id', videoRecord.store_id)
      .maybeSingle();

    const { data: video, error } = await admin
      .from('videos')
      .update({
        status: 'ready',
        ready_at: new Date().toISOString(),
        uploaded_at: new Date().toISOString(),
        file_size_bytes: parsed.data.file_size_bytes || null,
        duration_seconds: parsed.data.duration_seconds || null,
        resolution: parsed.data.resolution || null,
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
      order_id: video.order_id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      secondary_verification: storeSettings?.require_secondary_verification ?? false,
    });

    await admin
      .from('order_locks')
      .update({ released_at: new Date().toISOString() })
      .eq('order_id', video.order_id)
      .is('released_at', null);

    const appUrl = getWebAppUrl();
    const viewerUrl = `${appUrl}/view/${rawToken}`;

    const order = video.orders as Record<string, unknown> | null;
    const store = videoRecord.stores as Record<string, unknown> | null;
    const station = videoRecord.stations as Record<string, unknown> | null;
    let attachSuccess = false;
    let attachError: string | null = null;
    let emailSuccess = false;
    let emailError: string | null = null;

    if (order) {
      if (store?.paired_at && store.url && store.webhook_secret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const webhookSecret = decryptIfNeeded(store.webhook_secret as string, getEncryptionKey());
        const failedResponse = (error: unknown) =>
          ({
            ok: false,
            status: 0,
            json: async () => ({ error: String(error) }),
          }) as Response;

        const attachPayload = JSON.stringify({
          woo_order_id: order.woo_order_id,
          video_id: videoId,
          video_status: 'ready',
          recorded_at: video.ready_at,
          viewer_token_hash: tokenHash,
          viewer_url: viewerUrl,
          station_name: station?.name || null,
        });
        const attachSignature = generateHmac(`${timestamp}.${attachPayload}`, webhookSecret);
        const attachRequest = fetchWithTimeout(
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
          },
          8000
        ).catch(failedResponse);

        const emailPayload = JSON.stringify({
          woo_order_id: order.woo_order_id,
          viewer_url: viewerUrl,
        });
        const emailSignature = generateHmac(`${timestamp}.${emailPayload}`, webhookSecret);
        const emailRequest = fetchWithTimeout(
          buildExternalUrl(store.url as string, '/wp-json/packagepro/v1/send-email', {
            allowHttpLocalhost: process.env.NODE_ENV !== 'production',
          }),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-PackagePro-Signature': emailSignature,
              'X-PackagePro-Timestamp': String(timestamp),
            },
            body: emailPayload,
          },
          8000
        ).catch(failedResponse);

        const [attachRes, emailRes] = await Promise.all([attachRequest, emailRequest]);
        const attachJson = await attachRes.json().catch(() => ({}));
        attachSuccess = attachRes.ok && (attachJson as { success?: boolean }).success !== false;
        attachError = attachSuccess
          ? null
          : (attachJson as { error?: string; reason?: string }).error ||
            (attachJson as { reason?: string }).reason ||
            `HTTP ${attachRes.status}`;
        const emailJson = await emailRes.json().catch(() => ({}));
        emailSuccess = emailRes.ok && (emailJson as { success?: boolean }).success !== false;
        emailError = emailSuccess
          ? null
          : (emailJson as { error?: string; reason?: string }).error ||
            (emailJson as { reason?: string }).reason ||
            `HTTP ${emailRes.status}`;

        await admin.from('email_events').insert({
          order_id: video.order_id,
          store_id: video.store_id,
          type: 'packing_video_ready',
          recipient: (order.customer_email as string) || 'unknown',
          status: emailSuccess ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          error: emailError,
        });
      }
    }

    await writeAuditLog({
      admin,
      orgId: video.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'video_finalized',
      resourceType: 'video',
      resourceId: videoId,
      details: {
        attach_success: attachSuccess,
        attach_error: attachError,
        email_success: emailSuccess,
        email_error: emailError,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      video_id: videoId,
      viewer_url: viewerUrl,
      status: 'ready',
      delivery: {
        attach_success: attachSuccess,
        email_success: emailSuccess,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
