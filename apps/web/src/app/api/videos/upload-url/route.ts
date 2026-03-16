import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { STORAGE_BUCKET } from '@packagepro/shared';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { order_id, station_id } = body;

    if (!order_id || !station_id) {
      return NextResponse.json({ error: 'order_id and station_id required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: lock } = await supabase
      .from('order_locks')
      .select('*, orders(*)')
      .eq('order_id', order_id)
      .eq('station_id', station_id)
      .is('released_at', null)
      .single();

    if (!lock) {
      return NextResponse.json({ error: 'Order is not locked by this station' }, { status: 403 });
    }

    const order = lock.orders as Record<string, unknown>;
    const orgId = order.org_id as string;
    const storeId = order.store_id as string;
    const storagePath = `${orgId}/${storeId}/${order_id}/${Date.now()}.webm`;

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        org_id: orgId,
        store_id: storeId,
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

    await supabase.from('uploads').insert({
      video_id: video.id,
      station_id,
      status: 'pending',
      started_at: new Date().toISOString(),
    });

    const { data: signedUrl, error: signError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (signError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    await supabase.from('orders').update({ video_status: 'uploading' }).eq('id', order_id);

    return NextResponse.json({
      video_id: video.id,
      upload_url: signedUrl.signedUrl,
      storage_path: storagePath,
      token: signedUrl.token,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
