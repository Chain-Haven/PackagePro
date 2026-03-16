import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { STORAGE_BUCKET } from '@packagepro/shared';
import { requireCronAccess } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    await requireCronAccess(request);
    const admin = createAdminClient();

    const { data: settings } = await admin
      .from('store_settings')
      .select('store_id, retention_days');

    if (!settings || settings.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No store settings configured', timestamp: new Date().toISOString() });
    }

    let deletedCount = 0;

    for (const setting of settings) {
      const cutoffDate = new Date(
        Date.now() - setting.retention_days * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: videos } = await admin
        .from('videos')
        .select('id, storage_path')
        .eq('store_id', setting.store_id)
        .eq('status', 'ready')
        .lt('ready_at', cutoffDate);

      if (!videos) continue;

      for (const video of videos) {
        await admin.storage.from(STORAGE_BUCKET).remove([video.storage_path]);

        await admin
          .from('videos')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', video.id);

        await admin
          .from('video_access_tokens')
          .update({
            revoked_at: new Date().toISOString(),
          })
          .eq('video_id', video.id);

        deletedCount++;
      }
    }

    const rateLimitCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from('request_rate_limits')
      .delete()
      .lt('updated_at', rateLimitCutoff);

    return NextResponse.json({
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
