import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { decrypt } from '@packagepro/shared';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store || !store.paired_at) {
      return NextResponse.json({ error: 'Store not found or not paired' }, { status: 404 });
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || !store.consumer_key_encrypted || !store.consumer_secret_encrypted) {
      return NextResponse.json({ error: 'Store credentials missing' }, { status: 500 });
    }

    const consumerKey = decrypt(store.consumer_key_encrypted, encryptionKey);
    const consumerSecret = decrypt(store.consumer_secret_encrypted, encryptionKey);

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const wcUrl = `${store.url}/wp-json/wc/v3/orders?per_page=50&status=processing,on-hold,pending`;

    const wcResponse = await fetch(wcUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
    });

    if (!wcResponse.ok) {
      await admin.from('stores').update({ sync_status: 'error' }).eq('id', storeId);
      return NextResponse.json({ error: 'Failed to fetch orders from WooCommerce' }, { status: 502 });
    }

    const wcOrders = await wcResponse.json();
    let synced = 0;

    for (const wcOrder of wcOrders) {
      const orderData = {
        org_id: store.org_id,
        store_id: storeId,
        woo_order_id: wcOrder.id,
        woo_order_number: wcOrder.number || String(wcOrder.id),
        woo_order_key: wcOrder.order_key,
        status: wcOrder.status,
        customer_email: wcOrder.billing?.email || null,
        customer_name: [wcOrder.billing?.first_name, wcOrder.billing?.last_name].filter(Boolean).join(' ') || null,
        shipping_address: wcOrder.shipping || null,
        line_items: (wcOrder.line_items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          total: item.total,
        })),
        order_total: wcOrder.total,
        synced_at: new Date().toISOString(),
      };

      const { error } = await admin
        .from('orders')
        .upsert(orderData, { onConflict: 'store_id,woo_order_id' });

      if (!error) synced++;
    }

    await admin.from('stores').update({
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
    }).eq('id', storeId);

    return NextResponse.json({ success: true, synced_count: synced, total: wcOrders.length });
  } catch (err) {
    return handleApiError(err);
  }
}
