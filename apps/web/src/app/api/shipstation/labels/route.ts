import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrderAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { getEncryptionKey } from '@/lib/security';
import { CreateLabelRequestSchema, decryptIfNeeded } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';
import type { V2LabelRequest } from '@packagepro/shipstation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateLabelRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { order_id, carrier_id, service_code, ship_from, ship_to, packages: pkgs, account_id } = parsed.data;

    const admin = createAdminClient();
    const { order: accessibleOrder, user } = await requireOrderAccess(order_id, request);

    const { data: order } = await admin
      .from('orders')
      .select('*, stores(*, shipstation_store_mappings(*, shipstation_accounts(*)))')
      .eq('id', order_id)
      .single();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const store = (order as any).stores;
    const mapping = store?.shipstation_store_mappings?.[0];
    const account = mapping?.shipstation_accounts;

    if (!account) {
      return NextResponse.json({ error: 'No ShipStation account configured' }, { status: 400 });
    }

    if (account_id && account.id !== account_id) {
      return NextResponse.json(
        { error: 'Selected ShipStation account does not match the configured store mapping' },
        { status: 409 }
      );
    }

    const apiKeyData = decryptIfNeeded(account.api_key_encrypted, getEncryptionKey());
    const apiKey = apiKeyData.split(':')[0];
    const client = new ShipStationV2Client(apiKey);
    if (!ship_from) {
      return NextResponse.json({ error: 'ship_from is required' }, { status: 400 });
    }

    const shippingAddress = (order.shipping_address as Record<string, string>) || {};

    const labelRequest: V2LabelRequest = {
      shipment: {
        carrier_id,
        service_code,
        ship_to: ship_to || {
          name: order.customer_name || [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(' ') || '',
          address_line1: shippingAddress.address_1 || shippingAddress.address_line1 || '',
          address_line2: shippingAddress.address_2 || shippingAddress.address_line2 || '',
          city_locality: shippingAddress.city || shippingAddress.city_locality || '',
          state_province: shippingAddress.state || shippingAddress.state_province || '',
          postal_code: shippingAddress.postcode || shippingAddress.postal_code || '',
          country_code: shippingAddress.country || shippingAddress.country_code || 'US',
        },
        ship_from,
        packages: pkgs || [{ weight: { value: 16, unit: 'ounce' } }],
      },
    };

    const label = await client.createLabel(labelRequest);

    await admin.from('shipping_labels').insert({
      org_id: accessibleOrder.org_id,
      store_id: accessibleOrder.store_id,
      order_id,
      shipstation_account_id: account.id,
      external_label_id: label.label_id,
      tracking_number: label.tracking_number,
      label_download_url: label.label_download?.pdf || '',
      carrier_id,
      service_code,
      shipment_cost: label.shipment_cost?.amount || 0,
      currency: label.shipment_cost?.currency || 'USD',
      status: label.status,
      ship_to: labelRequest.shipment.ship_to,
      ship_from: labelRequest.shipment.ship_from,
      packages: labelRequest.shipment.packages,
      created_by: user.id,
    });

    await admin.from('orders').update({
      shipstation_order_id: label.label_id,
      tracking_number: label.tracking_number,
      shipment_status: label.status,
    }).eq('id', order_id);

    await writeAuditLog({
      admin,
      orgId: accessibleOrder.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'label_created',
      resourceType: 'order',
      resourceId: order_id,
      details: {
        label_id: label.label_id,
        tracking_number: label.tracking_number,
        carrier_id,
        service_code,
      },
      request,
    });

    return NextResponse.json({
      label_id: label.label_id,
      tracking_number: label.tracking_number,
      label_download_url: label.label_download?.pdf || '',
      shipment_cost: label.shipment_cost?.amount || 0,
      status: label.status,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
