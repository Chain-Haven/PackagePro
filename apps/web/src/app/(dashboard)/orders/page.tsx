import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { parseOrdersPageQuery } from '@/lib/orders/orders-page-query';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  woo_order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  video_status: string;
  tracking_number: string | null;
  shipment_status: string | null;
  synced_at: string | null;
  created_at: string;
};

type SearchParamValue = string | string[] | undefined;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamValue>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('organizations(id)')
    .eq('user_id', user.id);

  const organization = Array.isArray(memberships?.[0]?.organizations)
    ? memberships?.[0]?.organizations?.[0]
    : memberships?.[0]?.organizations;
  const orgId = organization?.id;

  if (!orgId) {
    redirect('/onboarding');
  }

  const query = parseOrdersPageQuery(await searchParams);
  let ordersQuery = supabase
    .from('orders')
    .select(
      'id, woo_order_number, customer_name, customer_email, status, video_status, tracking_number, shipment_status, synced_at, created_at',
      { count: 'exact' }
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range((query.page - 1) * query.perPage, query.page * query.perPage - 1);

  if (query.status) {
    ordersQuery = ordersQuery.eq('status', query.status);
  }
  if (query.videoStatus) {
    ordersQuery = ordersQuery.eq('video_status', query.videoStatus);
  }
  if (query.search) {
    const sanitized = query.search.replace(/[%_\\]/g, '').replace(/[^\w\s@.-]/g, '').slice(0, 100);
    if (sanitized) {
      ordersQuery = ordersQuery.or(
        `woo_order_number.ilike.%${sanitized}%,customer_name.ilike.%${sanitized}%,customer_email.ilike.%${sanitized}%`
      );
    }
  }

  const { data: orders, count } = await ordersQuery;

  const orderList: OrderRow[] = orders ?? [];
  const readyToPack = orderList.filter((order) => order.video_status === 'none').length;
  const inFlight = orderList.filter((order) => ['recording', 'uploading'].includes(order.video_status)).length;
  const completed = orderList.filter((order) => order.video_status === 'ready').length;
  const failed = orderList.filter((order) => order.video_status === 'failed').length;
  const totalOrders = count ?? 0;
  const totalPages = Math.max(Math.ceil(totalOrders / query.perPage), 1);
  const buildPageHref = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('per_page', String(query.perPage));
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    if (query.videoStatus) params.set('video_status', query.videoStatus);
    return `/orders?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>
      <p className="mt-2 text-muted-foreground">
        View synced WooCommerce orders, their packing-video state, and shipment status.
      </p>

      <form className="mt-6 grid gap-3 rounded-lg border border-border bg-background p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <input
          type="search"
          name="search"
          defaultValue={query.search}
          placeholder="Search order number, customer, or email"
          className="rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={query.status} className="rounded-lg border border-border px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="on-hold">On hold</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
        </select>
        <select
          name="video_status"
          defaultValue={query.videoStatus}
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">All video states</option>
          <option value="none">None</option>
          <option value="recording">Recording</option>
          <option value="uploading">Uploading</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Apply
        </button>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Ready to pack" value={String(readyToPack)} />
        <SummaryCard label="Recording or uploading" value={String(inFlight)} />
        <SummaryCard label="Video ready" value={String(completed)} />
        <SummaryCard label="Failed" value={String(failed)} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {(query.page - 1) * query.perPage + (orderList.length > 0 ? 1 : 0)}-
          {(query.page - 1) * query.perPage + orderList.length} of {totalOrders}
        </span>
        <span>Page {query.page} of {totalPages}</span>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Video</th>
              <th className="px-4 py-3 text-left font-medium">Shipment</th>
              <th className="px-4 py-3 text-left font-medium">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No orders synced yet.
                </td>
              </tr>
            ) : (
              orderList.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">#{order.woo_order_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{order.customer_name || 'Unknown customer'}</div>
                    <div className="text-xs">{order.customer_email || 'No email'}</div>
                  </td>
                  <td className="px-4 py-3">{order.status}</td>
                  <td className="px-4 py-3">{order.video_status}</td>
                  <td className="px-4 py-3">
                    <div>{order.shipment_status || 'Not purchased'}</div>
                    <div className="text-xs text-muted-foreground">{order.tracking_number || 'No tracking'}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.synced_at ? new Date(order.synced_at).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {query.page > 1 ? (
          <Link href={buildPageHref(query.page - 1)} className="rounded-lg border border-border px-4 py-2 text-sm">
            Previous
          </Link>
        ) : (
          <span />
        )}
        {query.page < totalPages ? (
          <Link href={buildPageHref(query.page + 1)} className="rounded-lg border border-border px-4 py-2 text-sm">
            Next
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
