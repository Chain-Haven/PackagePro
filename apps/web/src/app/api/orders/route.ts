import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const orgId = sp.get('org_id');
  const storeId = sp.get('store_id');
  const status = sp.get('status');
  const videoStatus = sp.get('video_status');
  const search = sp.get('search');
  const page = parseInt(sp.get('page') || '1', 10);
  const perPage = Math.min(parseInt(sp.get('per_page') || '25', 10), 100);

  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let query = admin
    .from('orders')
    .select('*, order_locks(*)', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (storeId) query = query.eq('store_id', storeId);
  if (status) query = query.eq('status', status);
  if (videoStatus) query = query.eq('video_status', videoStatus);
  if (search) query = query.or(`woo_order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

  const { data: orders, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({
    orders: orders ?? [],
    total: count ?? 0,
    page,
    per_page: perPage,
  });
}
