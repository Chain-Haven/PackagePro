import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgMember } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    const storeId = request.nextUrl.searchParams.get('store_id');
    const rawScan = request.nextUrl.searchParams.get('scan')?.trim() || '';

    if (!orgId || !rawScan) {
      return NextResponse.json({ error: 'org_id and scan are required' }, { status: 400 });
    }

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();
    const scan = rawScan.slice(0, 100);
    const makeBaseQuery = () => {
      let query = admin
        .from('orders')
        .select('id, woo_order_id, woo_order_number, customer_name, status, video_status')
        .eq('org_id', orgId)
        .limit(1);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      return query;
    };

    let order = null;

    if (/^[0-9a-f-]{36}$/i.test(scan)) {
      const { data } = await makeBaseQuery().eq('id', scan).maybeSingle();
      order = data;
    }

    if (!order) {
      const { data } = await makeBaseQuery().eq('woo_order_number', scan).maybeSingle();
      order = data;
    }

    if (!order && /^\d+$/.test(scan)) {
      const { data } = await makeBaseQuery()
        .eq('woo_order_id', Number.parseInt(scan, 10))
        .maybeSingle();
      order = data;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}
