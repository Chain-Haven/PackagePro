import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { generateHmac } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await request.text();
    const signature = request.headers.get('X-PackagePro-Signature');
    const timestamp = request.headers.get('X-PackagePro-Timestamp');

    const admin = createAdminClient();

    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store || !store.webhook_secret) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (signature && timestamp) {
      const expected = generateHmac(`${timestamp}.${body}`, store.webhook_secret);

      if (signature !== expected) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > 300) {
        return NextResponse.json({ error: 'Request expired' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const topic = payload.topic || request.headers.get('X-PackagePro-Topic') || 'unknown';

    await admin.from('webhook_deliveries').insert({
      store_id: storeId,
      source: 'woocommerce',
      topic,
      payload,
      status: 'received',
    });

    if (payload.order) {
      const orderData = payload.order;
      const upsertData = {
        org_id: store.org_id,
        store_id: storeId,
        woo_order_id: orderData.id,
        woo_order_number: orderData.number || String(orderData.id),
        woo_order_key: orderData.order_key || null,
        status: orderData.status,
        customer_email: orderData.billing_email || null,
        customer_name: [orderData.billing_first_name, orderData.billing_last_name].filter(Boolean).join(' ') || null,
        shipping_address: orderData.shipping || null,
        line_items: orderData.line_items || [],
        order_total: orderData.total || null,
        synced_at: new Date().toISOString(),
      };

      await admin.from('orders').upsert(upsertData, { onConflict: 'store_id,woo_order_id' });
    }

    await admin
      .from('webhook_deliveries')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('store_id', storeId)
      .eq('topic', topic)
      .order('created_at', { ascending: false })
      .limit(1);

    return NextResponse.json({ received: true });
  } catch (err) {
    return handleApiError(err);
  }
}
