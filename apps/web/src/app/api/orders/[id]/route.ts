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
      .select('*, order_locks(*), stores(id, name, url, shipstation_store_mappings(shipstation_account_id))')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const store = order.stores as Record<string, unknown> | null;
    const preferredAccountId =
      Array.isArray(store?.shipstation_store_mappings) &&
      store.shipstation_store_mappings.length > 0
        ? (store.shipstation_store_mappings[0] as Record<string, string>).shipstation_account_id
        : null;

    return NextResponse.json({
      order: {
        ...order,
        preferred_shipstation_account_id: preferredAccountId,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
