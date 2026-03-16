import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { enforceRateLimit, getEncryptionKey } from '@/lib/security';
import { decryptIfNeeded, verifyHmac, WEBHOOK_RATE_LIMIT_PER_MIN, WEBHOOK_RATE_LIMIT_WINDOW_SECONDS } from '@packagepro/shared';
import { z } from 'zod';

const WooWebhookEnvelopeSchema = z.object({
  topic: z.string().min(1).max(100).optional(),
  order: z.object({
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
  }).optional(),
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
    const idempotencyKey = request.headers.get('X-PackagePro-Idempotency-Key');
    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: store } = await admin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store || !store.webhook_secret) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    await enforceRateLimit(
      request,
      'woo-webhook',
      storeId,
      WEBHOOK_RATE_LIMIT_PER_MIN,
      WEBHOOK_RATE_LIMIT_WINDOW_SECONDS
    );

    const parsedTimestamp = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(parsedTimestamp)) {
      return NextResponse.json({ error: 'Invalid timestamp' }, { status: 401 });
    }

    if (Math.abs(Date.now() / 1000 - parsedTimestamp) > 300) {
      return NextResponse.json({ error: 'Request expired' }, { status: 401 });
    }

    const webhookSecret = decryptIfNeeded(store.webhook_secret, getEncryptionKey());
    if (!verifyHmac(`${timestamp}.${body}`, webhookSecret, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const parsedPayload = WooWebhookEnvelopeSchema.safeParse(payload);
    if (!parsedPayload.success) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const topic = parsedPayload.data.topic || request.headers.get('X-PackagePro-Topic') || 'unknown';

    if (idempotencyKey) {
      const { data: existingDelivery } = await admin
        .from('webhook_deliveries')
        .select('id')
        .eq('store_id', storeId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingDelivery) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    const { data: delivery } = await admin.from('webhook_deliveries').insert({
      store_id: storeId,
      source: 'woocommerce',
      topic,
      payload,
      idempotency_key: idempotencyKey,
      status: 'received',
    }).select('id').single();

    if (parsedPayload.data.order) {
      const orderData = parsedPayload.data.order;
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

    if (delivery?.id) {
      await admin
        .from('webhook_deliveries')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', delivery.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return handleApiError(err);
  }
}
