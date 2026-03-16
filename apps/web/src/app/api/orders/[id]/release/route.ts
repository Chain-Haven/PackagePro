import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const stationId = body.station_id;

  const admin = createAdminClient();

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

  return NextResponse.json({ success: true });
}
