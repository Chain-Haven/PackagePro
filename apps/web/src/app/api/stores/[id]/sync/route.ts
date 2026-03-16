import { NextRequest, NextResponse } from 'next/server';
import { requireStoreAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { buildExternalUrl, enforceRateLimit, getEncryptionKey } from '@/lib/security';
import {
  API_WRITE_RATE_LIMIT_PER_MIN,
  API_WRITE_RATE_LIMIT_WINDOW_SECONDS,
  decryptIfNeeded,
} from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params;
    const { store, user, admin } = await requireStoreAccess(storeId, request, [
      'org_owner',
      'org_admin',
    ]);

    await enforceRateLimit(
      request,
      'store-sync',
      `${user.id}:${storeId}`,
      API_WRITE_RATE_LIMIT_PER_MIN,
      API_WRITE_RATE_LIMIT_WINDOW_SECONDS
    );

    if (!store.paired_at) {
      return NextResponse.json({ error: 'Store not found or not paired' }, { status: 404 });
    }

    const encryptionKey = getEncryptionKey();
    if (!store.consumer_key_encrypted || !store.consumer_secret_encrypted) {
      return NextResponse.json({ error: 'Store credentials missing' }, { status: 500 });
    }

    const consumerKey = decryptIfNeeded(store.consumer_key_encrypted, encryptionKey);
    const consumerSecret = decryptIfNeeded(store.consumer_secret_encrypted, encryptionKey);

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const wcUrl = buildExternalUrl(store.url, '/wp-json/wc/v3/orders', {
      allowHttpLocalhost: process.env.NODE_ENV !== 'production',
    });
    let synced = 0;
    let total = 0;

    await admin
      .from('stores')
      .update({ sync_status: 'syncing' })
      .eq('id', storeId);

    const wcOrders: any[] = [];
    for (let page = 1; page <= 20; page += 1) {
      const pageUrl = new URL(wcUrl);
      pageUrl.searchParams.set('per_page', '100');
      pageUrl.searchParams.set('page', String(page));
      pageUrl.searchParams.set('status', 'processing,on-hold,pending');

      const wcResponse = await fetch(pageUrl, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!wcResponse.ok) {
        await admin.from('stores').update({ sync_status: 'error' }).eq('id', storeId);
        return NextResponse.json(
          { error: 'Failed to fetch orders from WooCommerce' },
          { status: 502 }
        );
      }

      const pageOrders = await wcResponse.json();
      if (!Array.isArray(pageOrders) || pageOrders.length === 0) {
        break;
      }

      wcOrders.push(...pageOrders);
      if (pageOrders.length < 100) {
        break;
      }
    }

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
      total++;
    }

    await admin.from('stores').update({
      sync_status: 'synced',
      last_sync_at: new Date().toISOString(),
    }).eq('id', storeId);

    await writeAuditLog({
      admin,
      orgId: store.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'store_synced',
      resourceType: 'store',
      resourceId: storeId,
      details: { synced_count: synced, total },
      request,
    });

    return NextResponse.json({ success: true, synced_count: synced, total });
  } catch (err) {
    return handleApiError(err);
  }
}
