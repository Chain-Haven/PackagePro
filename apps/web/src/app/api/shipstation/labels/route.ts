import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { decrypt } from '@packagepro/shared';
import { ShipStationV2Client } from '@packagepro/shipstation';
import type { V2LabelRequest } from '@packagepro/shipstation';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { order_id, carrier_id, service_code, ship_from, packages: pkgs } = body;

    if (!order_id || !carrier_id || !service_code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const admin = createAdminClient();

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

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const apiKeyData = decrypt(account.api_key_encrypted, encryptionKey);
    const apiKey = apiKeyData.split(':')[0];
    const client = new ShipStationV2Client(apiKey);

    const shippingAddress = (order.shipping_address as Record<string, string>) || {};

    const labelRequest: V2LabelRequest = {
      shipment: {
        carrier_id,
        service_code,
        ship_to: {
          name: order.customer_name || [shippingAddress.first_name, shippingAddress.last_name].filter(Boolean).join(' ') || '',
          address_line1: shippingAddress.address_1 || shippingAddress.address_line1 || '',
          address_line2: shippingAddress.address_2 || shippingAddress.address_line2 || '',
          city_locality: shippingAddress.city || shippingAddress.city_locality || '',
          state_province: shippingAddress.state || shippingAddress.state_province || '',
          postal_code: shippingAddress.postcode || shippingAddress.postal_code || '',
          country_code: shippingAddress.country || shippingAddress.country_code || 'US',
        },
        ship_from: ship_from || {
          name: 'Warehouse',
          address_line1: '',
          city_locality: '',
          state_province: '',
          postal_code: '',
          country_code: 'US',
        },
        packages: pkgs || [{ weight: { value: 16, unit: 'ounce' } }],
      },
    };

    const label = await client.createLabel(labelRequest);

    await admin.from('orders').update({
      shipstation_order_id: label.label_id,
    }).eq('id', order_id);

    await admin.from('audit_logs').insert({
      org_id: order.org_id,
      actor_id: user.id,
      actor_type: 'user',
      action: 'label_created',
      resource_type: 'order',
      resource_id: order_id,
      details: { label_id: label.label_id, tracking_number: label.tracking_number },
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
