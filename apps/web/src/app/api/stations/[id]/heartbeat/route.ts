import { NextRequest, NextResponse } from 'next/server';
import { requireStationAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: stationId } = await params;
    const { admin } = await requireStationAccess(stationId, request);
    const { error } = await admin
      .from('stations')
      .update({
        status: 'online',
        last_heartbeat: new Date().toISOString(),
      })
      .eq('id', stationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
