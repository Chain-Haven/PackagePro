import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { STORAGE_BUCKET } from '@packagepro/shared';

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { order_id, station_id } = body;

  if (!order_id || !station_id) {
    return NextResponse.json({ error: 'order_id and station_id required' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: lock } = await admin
    .from('order_locks')
    .select('*, orders(*)')
    .eq('order_id', order_id)
    .eq('station_id', station_id)
    .is('released_at', null)
    .single();

  if (!lock) {
    return NextResponse.json({ error: 'Order is not locked by this station' }, { status: 403 });
  }

  const order = lock.orders as any;
  const storagePath = `${order.org_id}/${order.store_id}/${order_id}/${Date.now()}.mp4`;

  const { data: video, error: videoError } = await admin
    .from('videos')
    .insert({
      org_id: order.org_id,
      store_id: order.store_id,
      order_id,
      station_id,
      user_id: user.id,
      storage_path: storagePath,
      status: 'uploading',
    })
    .select()
    .single();

  if (videoError || !video) {
    return NextResponse.json({ error: 'Failed to create video record' }, { status: 500 });
  }

  await admin.from('uploads').insert({
    video_id: video.id,
    station_id,
    status: 'pending',
    started_at: new Date().toISOString(),
  });

  const { data: signedUrl, error: signError } = await admin
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (signError || !signedUrl) {
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  await admin.from('orders').update({ video_status: 'uploading' }).eq('id', order_id);

  return NextResponse.json({
    video_id: video.id,
    upload_url: signedUrl.signedUrl,
    storage_path: storagePath,
    token: signedUrl.token,
  }, { status: 201 });
}
