import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { enforceRateLimit, getEncryptionKey } from '@/lib/security';
import {
  decryptIfNeeded,
  verifyHmac,
  WEBHOOK_RATE_LIMIT_PER_MIN,
  WEBHOOK_RATE_LIMIT_WINDOW_SECONDS,
} from '@packagepro/shared';
import { z } from 'zod';

const ReconcilePayloadSchema = z.object({
  store_id: z.string().uuid(),
  orders: z.array(
    z.object({
      id: z.number().int(),
      number: z.string().optional(),
      order_key: z.string().optional(),
      status: z.string(),
      total: z.union([z.string(), z.number()]).optional(),
      billing_email: z.string().email().optional().nullable(),
      billing_first_name: z.string().optional().nullable(),
      billing_last_name: z.string().optional().nullable(),
      shipping: z.record(z.unknown()).optional().nullable(),
      line_items: z.array(z.record(z.unknown())).optional(),
    })
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params;
    const body = await request.text();
    const signature = request.headers.get('X-PackagePro-Signature');
    const timestamp = request.headers.get('X-PackagePro-Timestamp');

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    await enforceRateLimit(
      request,
      'woo-reconcile',
      storeId,
      WEBHOOK_RATE_LIMIT_PER_MIN,
      WEBHOOK_RATE_LIMIT_WINDOW_SECONDS
    );

    const admin = createAdminClient();
    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store || !store.webhook_secret) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const parsedTimestamp = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() / 1000 - parsedTimestamp) > 300) {
      return NextResponse.json({ error: 'Request expired' }, { status: 401 });
    }

    const webhookSecret = decryptIfNeeded(store.webhook_secret, getEncryptionKey());
    if (!verifyHmac(`${timestamp}.${body}`, webhookSecret, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const parsedPayload = ReconcilePayloadSchema.safeParse(payload);
    if (!parsedPayload.success || parsedPayload.data.store_id !== storeId) {
      return NextResponse.json({ error: 'Invalid reconcile payload' }, { status: 400 });
    }

    const { data: delivery } = await admin
      .from('webhook_deliveries')
      .insert({
        store_id: storeId,
        source: 'woocommerce',
        topic: 'orders.reconcile',
        payload,
        status: 'received',
      })
      .select('id')
      .single();

    for (const order of parsedPayload.data.orders) {
      await admin.from('orders').upsert(
        {
          org_id: store.org_id,
          store_id: storeId,
          woo_order_id: order.id,
          woo_order_number: order.number || String(order.id),
          woo_order_key: order.order_key || null,
          status: order.status,
          customer_email: order.billing_email || null,
          customer_name: [order.billing_first_name, order.billing_last_name]
            .filter(Boolean)
            .join(' ') || null,
          shipping_address: order.shipping || null,
          line_items: order.line_items || [],
          order_total: order.total ? String(order.total) : null,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'store_id,woo_order_id' }
      );
    }

    if (delivery?.id) {
      await admin
        .from('webhook_deliveries')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', delivery.id);
    }

    return NextResponse.json({ success: true, reconciled: parsedPayload.data.orders.length });
  } catch (err) {
    return handleApiError(err);
  }
}
