import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgMember } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { getHealthSnapshot } from '@/lib/health';
import { buildOperationalHealthChecks } from '@/lib/operational-health';
import { getWebEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();
    const health = await getHealthSnapshot(createAdminClient, getWebEnv);

    const { data: stores } = await admin
      .from('stores')
      .select('id, paired_at')
      .eq('org_id', orgId);

    const storeIds = (stores ?? []).map((store: { id: string }) => store.id);
    const { data: orgOrders } = await admin
      .from('orders')
      .select('id')
      .eq('org_id', orgId);
    const orderIds = (orgOrders ?? []).map((order: { id: string }) => order.id);

    const [{ count: failedUploads }, { count: staleLocks }, { count: failedEmails }] =
      await Promise.all([
        admin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('video_status', 'failed'),
        admin
          .from('order_locks')
          .select('id', { count: 'exact', head: true })
          .in('order_id', orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000'])
          .is('released_at', null)
          .lt('expires_at', new Date().toISOString()),
        admin
          .from('email_events')
          .select('id', { count: 'exact', head: true })
          .in('store_id', storeIds.length > 0 ? storeIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('status', 'failed'),
      ]);

    const unpairedStoreCount = (stores ?? []).filter((store: { paired_at?: string | null }) => !store.paired_at).length;
    const checks = buildOperationalHealthChecks({
      platformStatus: health.status === 'ok' ? 'ok' : 'degraded',
      supabaseStatus: health.checks.supabase,
      cronStatus: health.checks.cron,
      staleLockCount: staleLocks ?? 0,
      failedUploadCount: failedUploads ?? 0,
      failedEmailCount: failedEmails ?? 0,
      unpairedStoreCount,
    });

    const overallStatus = checks.some((check) => check.status === 'error')
      ? 'error'
      : checks.some((check) => check.status === 'warning')
        ? 'warning'
        : 'ok';

    return NextResponse.json({
      status: overallStatus,
      checks,
      timestamp: health.timestamp,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
