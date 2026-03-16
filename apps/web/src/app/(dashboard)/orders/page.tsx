import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
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

  const { data: orders } = await supabase
    .from('orders')
    .select('id, woo_order_number, customer_name, customer_email, status, video_status, tracking_number, shipment_status, synced_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  const orderList = (orders as any[]) || [];
  const readyToPack = orderList.filter((order) => order.video_status === 'none').length;
  const inFlight = orderList.filter((order) => ['recording', 'uploading'].includes(order.video_status)).length;
  const completed = orderList.filter((order) => order.video_status === 'ready').length;
  const failed = orderList.filter((order) => order.video_status === 'failed').length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Orders</h1>
      <p className="mt-2 text-muted-foreground">
        View synced WooCommerce orders, their packing-video state, and shipment status.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Ready to pack" value={String(readyToPack)} />
        <SummaryCard label="Recording or uploading" value={String(inFlight)} />
        <SummaryCard label="Video ready" value={String(completed)} />
        <SummaryCard label="Failed" value={String(failed)} />
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
