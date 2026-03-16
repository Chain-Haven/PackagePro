import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STORAGE_BUCKET } from '@packagepro/shared';

export async function POST() {
  const cronSecret = process.env.CRON_SECRET;
  // In production, verify cron secret header

  const admin = createAdminClient();

  // Get stores with their retention settings
  const { data: settings } = await admin
    .from('store_settings')
    .select('store_id, retention_days');

  if (!settings) return NextResponse.json({ error: 'No settings found' }, { status: 500 });

  let deletedCount = 0;

  for (const setting of settings) {
    const cutoffDate = new Date(
      Date.now() - setting.retention_days * 24 * 60 * 60 * 1000
    ).toISOString();

    // Find expired videos
    const { data: videos } = await admin
      .from('videos')
      .select('id, storage_path')
      .eq('store_id', setting.store_id)
      .eq('status', 'ready')
      .lt('ready_at', cutoffDate);

    if (!videos) continue;

    for (const video of videos) {
      // Delete from storage
      await admin.storage.from(STORAGE_BUCKET).remove([video.storage_path]);

      // Mark as deleted
      await admin
        .from('videos')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', video.id);

      // Revoke access tokens
      await admin
        .from('video_access_tokens')
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq('video_id', video.id);

      deletedCount++;
    }
  }

  return NextResponse.json({
    deleted: deletedCount,
    timestamp: new Date().toISOString(),
  });
}
