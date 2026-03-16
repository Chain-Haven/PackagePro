import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  const admin = createAdminClient();

  // Release expired order locks
  const { data: expired } = await admin
    .from('order_locks')
    .update({ released_at: new Date().toISOString() })
    .is('released_at', null)
    .lt('expires_at', new Date().toISOString())
    .select();

  // Mark stations as offline if no heartbeat in 2 minutes
  const offlineCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  await admin
    .from('stations')
    .update({ status: 'offline' })
    .eq('status', 'online')
    .lt('last_heartbeat', offlineCutoff);

  // Find stuck uploads (pending for > 1 hour) and mark as failed
  const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: stuckUploads } = await admin
    .from('uploads')
    .update({ status: 'failed', last_error: 'Timed out' })
    .eq('status', 'uploading')
    .lt('started_at', stuckCutoff)
    .select();

  // Update video statuses for stuck uploads
  if (stuckUploads) {
    for (const upload of stuckUploads) {
      await admin.from('videos').update({ status: 'failed' }).eq('id', upload.video_id);
    }
  }

  return NextResponse.json({
    expired_locks_released: expired?.length || 0,
    stuck_uploads_failed: stuckUploads?.length || 0,
    timestamp: new Date().toISOString(),
  });
}
