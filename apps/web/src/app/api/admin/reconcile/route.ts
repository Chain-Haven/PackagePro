import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-utils';
import { requireCronAccess } from '@/lib/security';
import { runOperationalSelfHeal } from '@/lib/self-heal';

export async function POST(request: NextRequest) {
  try {
    await requireCronAccess(request);
    const admin = createAdminClient();
    const result = await runOperationalSelfHeal(admin);

    return NextResponse.json({
      expired_locks_released: result.expiredLocksReleased,
      stuck_uploads_failed: result.stuckUploadsFailed,
      offline_stations_updated: result.offlineStationsUpdated,
      timestamp: result.timestamp,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
