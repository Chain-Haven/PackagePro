import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { ORDER_LOCK_DEFAULT_MINUTES, ORDER_LOCK_MAX_MINUTES } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const stationId = body.station_id;
    const durationMinutes = Math.min(body.duration_minutes || ORDER_LOCK_DEFAULT_MINUTES, ORDER_LOCK_MAX_MINUTES);

    if (!stationId) {
      return NextResponse.json({ error: 'station_id required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existingLock } = await admin
      .from('order_locks')
      .select('*')
      .eq('order_id', orderId)
      .is('released_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingLock) {
      if (existingLock.station_id === stationId) {
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        await admin.from('order_locks').update({ expires_at: expiresAt }).eq('id', existingLock.id);
        return NextResponse.json({ lock_id: existingLock.id, order_id: orderId, station_id: stationId, expires_at: expiresAt });
      }
      return NextResponse.json({
        error: 'Order is locked by another station',
        locked_by_station: existingLock.station_id,
      }, { status: 409 });
    }

    const { data: stationLock } = await admin
      .from('order_locks')
      .select('*')
      .eq('station_id', stationId)
      .is('released_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stationLock) {
      return NextResponse.json({
        error: 'Station already has an active order lock',
        locked_order_id: stationLock.order_id,
      }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { data: lock, error } = await admin
      .from('order_locks')
      .insert({
        order_id: orderId,
        station_id: stationId,
        user_id: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error || !lock) {
      return NextResponse.json({ error: 'Failed to create lock' }, { status: 500 });
    }

    await admin.from('orders').update({ video_status: 'recording' }).eq('id', orderId);

    return NextResponse.json({
      lock_id: lock.id,
      order_id: orderId,
      station_id: stationId,
      expires_at: expiresAt,
    }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
