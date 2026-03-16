import { NextRequest, NextResponse } from 'next/server';
import { requireOrderAccess, requireStationAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { enforceRateLimit } from '@/lib/security';
import {
  API_WRITE_RATE_LIMIT_PER_MIN,
  API_WRITE_RATE_LIMIT_WINDOW_SECONDS,
} from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json().catch(() => ({}));
    const stationId = body.station_id;
    const { order, user, admin } = await requireOrderAccess(orderId, request);

    if (stationId) {
      const { station } = await requireStationAccess(stationId, request);
      if (station.org_id !== order.org_id || station.store_id !== order.store_id) {
        return NextResponse.json({ error: 'Station is not assigned to this store' }, { status: 409 });
      }
    }

    await enforceRateLimit(
      request,
      'order-release',
      `${user.id}:${orderId}:${stationId ?? 'any'}`,
      API_WRITE_RATE_LIMIT_PER_MIN,
      API_WRITE_RATE_LIMIT_WINDOW_SECONDS
    );

    let query = admin
      .from('order_locks')
      .update({ released_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .is('released_at', null);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to release lock' }, { status: 500 });
    }

    if (order.video_status === 'recording') {
      await admin.from('orders').update({ video_status: 'none' }).eq('id', orderId);
    }

    await writeAuditLog({
      admin,
      orgId: order.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'order_released',
      resourceType: 'order',
      resourceId: orderId,
      details: { station_id: stationId ?? null },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
