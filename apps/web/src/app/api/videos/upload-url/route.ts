import { NextRequest, NextResponse } from 'next/server';
import { requireOrderAccess, requireStationAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { RequestUploadUrlSchema, STORAGE_BUCKET } from '@packagepro/shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestUploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      order: orderRecord,
      user,
      admin,
    } = await requireOrderAccess(parsed.data.order_id, request);
    const { station } = await requireStationAccess(parsed.data.station_id, request);

    if (station.org_id !== orderRecord.org_id || station.store_id !== orderRecord.store_id) {
      return NextResponse.json({ error: 'Station is not assigned to this store' }, { status: 409 });
    }

    const { data: lock } = await admin
      .from('order_locks')
      .select('*, orders(*)')
      .eq('order_id', parsed.data.order_id)
      .eq('station_id', parsed.data.station_id)
      .is('released_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!lock) {
      return NextResponse.json({ error: 'Order is not locked by this station' }, { status: 403 });
    }

    const order = lock.orders as Record<string, unknown>;
    const orgId = order.org_id as string;
    const storeId = order.store_id as string;
    const storagePath = `${orgId}/${storeId}/${parsed.data.order_id}/${Date.now()}.webm`;

    const { data: video, error: videoError } = await admin
      .from('videos')
      .insert({
        org_id: orgId,
        store_id: storeId,
        order_id: parsed.data.order_id,
        station_id: parsed.data.station_id,
        user_id: user.id,
        storage_path: storagePath,
        status: 'uploading',
        file_size_bytes: parsed.data.file_size_bytes || null,
      })
      .select()
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
    }

    await admin.from('uploads').insert({
      video_id: video.id,
      station_id: parsed.data.station_id,
      status: 'uploading',
      started_at: new Date().toISOString(),
    });

    const { data: signedUrl, error: signError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (signError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    await admin.from('orders').update({ video_status: 'uploading' }).eq('id', parsed.data.order_id);
    await writeAuditLog({
      admin,
      orgId,
      actorId: user.id,
      actorType: 'user',
      action: 'video_upload_requested',
      resourceType: 'video',
      resourceId: video.id,
      details: {
        order_id: parsed.data.order_id,
        station_id: parsed.data.station_id,
        content_type: parsed.data.content_type,
        file_size_bytes: parsed.data.file_size_bytes ?? null,
      },
      request,
    });

    return NextResponse.json(
      {
        video_id: video.id,
        upload_url: signedUrl.signedUrl,
        storage_path: storagePath,
        token: signedUrl.token,
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
