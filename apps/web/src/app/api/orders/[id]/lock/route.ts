import { NextRequest, NextResponse } from 'next/server';
import { requireOrderAccess, requireStationAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/security';
import {
  API_WRITE_RATE_LIMIT_PER_MIN,
  API_WRITE_RATE_LIMIT_WINDOW_SECONDS,
  ORDER_LOCK_DEFAULT_MINUTES,
  ORDER_LOCK_MAX_MINUTES,
} from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const stationId = body.station_id;
    const durationMinutes = Math.min(body.duration_minutes || ORDER_LOCK_DEFAULT_MINUTES, ORDER_LOCK_MAX_MINUTES);

    if (!stationId) {
      return NextResponse.json({ error: 'station_id required' }, { status: 400 });
    }

    const { order, user, admin } = await requireOrderAccess(orderId, request);
    const { station } = await requireStationAccess(stationId, request);

    if (station.org_id !== order.org_id || station.store_id !== order.store_id) {
      return NextResponse.json({ error: 'Station is not assigned to this store' }, { status: 409 });
    }

    await enforceRateLimit(
      request,
      'order-lock',
      `${user.id}:${orderId}:${stationId}`,
      API_WRITE_RATE_LIMIT_PER_MIN,
      API_WRITE_RATE_LIMIT_WINDOW_SECONDS
    );

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
        await writeAuditLog({
          admin,
          orgId: order.org_id,
          actorId: user.id,
          actorType: 'user',
          action: 'order_lock_extended',
          resourceType: 'order',
          resourceId: orderId,
          details: { station_id: stationId, expires_at: expiresAt },
          request,
        });
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
      if ((error as { code?: string } | null)?.code === '23505') {
        return NextResponse.json(
          { error: 'Order is locked by another station' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create lock' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: order.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'order_locked',
      resourceType: 'order',
      resourceId: orderId,
      details: { station_id: stationId, lock_id: lock.id, expires_at: expiresAt },
      request,
    });

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
