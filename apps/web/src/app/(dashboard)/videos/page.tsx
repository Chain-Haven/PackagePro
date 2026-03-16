import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function VideosPage() {
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

  const [
    { count: totalVideos },
    { count: failedVideos },
    { count: pendingUploads },
    { data: videos },
  ] = await Promise.all([
    supabase.from('videos').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'failed'),
    supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'uploading'),
    supabase
      .from('videos')
      .select('id, status, ready_at, created_at, file_size_bytes, duration_seconds, orders(woo_order_number, customer_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const videoList = (videos as any[]) || [];
  const storageBytes = videoList.reduce(
    (sum, video) => sum + Number(video.file_size_bytes || 0),
    0
  );

  return (
    <div>
      <h1 className="text-3xl font-bold">Videos</h1>
      <p className="mt-2 text-muted-foreground">
        Review recorded packing videos, upload outcomes, and the orders they belong to.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total Videos" value={String(totalVideos ?? 0)} />
        <SummaryCard label="Pending Uploads" value={String(pendingUploads ?? 0)} />
        <SummaryCard label="Failed" value={String(failedVideos ?? 0)} />
        <SummaryCard
          label="Storage Used (recent list)"
          value={`${(storageBytes / (1024 * 1024)).toFixed(1)} MB`}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Recorded</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {videoList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No videos recorded yet.
                </td>
              </tr>
            ) : (
              videoList.map((video) => (
                <tr key={video.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium">#{video.orders?.woo_order_number || 'Unknown'}</div>
                    <div className="text-xs text-muted-foreground">
                      {video.orders?.customer_name || 'Unknown customer'}
                    </div>
                  </td>
                  <td className="px-4 py-3">{video.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {video.ready_at
                      ? new Date(video.ready_at).toLocaleString()
                      : new Date(video.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {video.duration_seconds ? `${video.duration_seconds}s` : 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {video.file_size_bytes
                      ? `${(Number(video.file_size_bytes) / (1024 * 1024)).toFixed(1)} MB`
                      : 'Unknown'}
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
