import { NextRequest, NextResponse } from 'next/server';
import { requireOrderAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { admin } = await requireOrderAccess(orderId, request);

    const { data: order, error } = await admin
      .from('orders')
      .select('*, order_locks(*), stores(id, name, url)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
