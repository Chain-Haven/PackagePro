import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { requireCronAccess } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    await requireCronAccess(request);
    const admin = createAdminClient();

    const { data: expired } = await admin
      .from('order_locks')
      .update({ released_at: new Date().toISOString() })
      .is('released_at', null)
      .lt('expires_at', new Date().toISOString())
      .select();

    const offlineCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    await admin
      .from('stations')
      .update({ status: 'offline' })
      .eq('status', 'online')
      .lt('last_heartbeat', offlineCutoff);

    const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: stuckUploads } = await admin
      .from('uploads')
      .update({ status: 'failed', last_error: 'Timed out' })
      .eq('status', 'uploading')
      .lt('started_at', stuckCutoff)
      .select();

    if (stuckUploads) {
      for (const upload of stuckUploads) {
        const { data: video } = await admin
          .from('videos')
          .select('order_id')
          .eq('id', upload.video_id)
          .single();

        await admin.from('videos').update({ status: 'failed' }).eq('id', upload.video_id);
        if (video?.order_id) {
          await admin
            .from('orders')
            .update({ video_status: 'failed' })
            .eq('id', video.order_id);
        }
      }
    }

    return NextResponse.json({
      expired_locks_released: expired?.length || 0,
      stuck_uploads_failed: stuckUploads?.length || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
