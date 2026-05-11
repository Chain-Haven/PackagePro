export async function runOperationalSelfHeal(admin: any, orgId?: string) {
  const nowIso = new Date().toISOString();
  const offlineCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const stuckCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  let expiredLockIds: string[] = [];

  if (orgId) {
    const { data: orgOrders } = await admin.from('orders').select('id').eq('org_id', orgId);
    const orderIds = (orgOrders ?? []).map((row: { id: string }) => row.id);

    if (orderIds.length > 0) {
      const { data: expiredLockRows } = await admin
        .from('order_locks')
        .select('id')
        .in('order_id', orderIds)
        .is('released_at', null)
        .lt('expires_at', nowIso);

      expiredLockIds = (expiredLockRows ?? []).map((row: { id: string }) => row.id);
    }
  } else {
    const { data: expiredLockRows } = await admin
      .from('order_locks')
      .select('id')
      .is('released_at', null)
      .lt('expires_at', nowIso);

    expiredLockIds = (expiredLockRows ?? []).map((row: { id: string }) => row.id);
  }

  if (expiredLockIds.length > 0) {
    await admin.from('order_locks').update({ released_at: nowIso }).in('id', expiredLockIds);
  }

  let offlineStationsUpdated = 0;
  const stationUpdate = admin
    .from('stations')
    .update({ status: 'offline' })
    .eq('status', 'online')
    .lt('last_heartbeat', offlineCutoff);
  const scopedStationUpdate = orgId ? stationUpdate.eq('org_id', orgId) : stationUpdate;
  const { data: offlineStations } = await scopedStationUpdate.select('id');
  offlineStationsUpdated = offlineStations?.length ?? 0;

  let stuckUploadIds: string[] = [];
  let stuckVideoRefs: Array<{ video_id: string; order_id: string | null }> = [];
  type VideoRef = { id: string; order_id: string | null };

  if (orgId) {
    const { data: stuckUploadRows } = await admin
      .from('uploads')
      .select('id, video_id')
      .eq('status', 'uploading')
      .lt('started_at', stuckCutoff);

    const videoIds = (stuckUploadRows ?? []).map((row: { video_id: string }) => row.video_id);
    const { data: videos } =
      videoIds.length > 0
        ? await admin.from('videos').select('id, order_id').eq('org_id', orgId).in('id', videoIds)
        : { data: [] as VideoRef[] };

    const videoMap = new Map<string, VideoRef>(
      (videos ?? []).map((video: VideoRef) => [video.id, video])
    );
    const matchingRows = (stuckUploadRows ?? []).filter((row: { video_id: string }) =>
      videoMap.has(row.video_id)
    );
    stuckUploadIds = matchingRows.map((row: { id: string }) => row.id);
    stuckVideoRefs = matchingRows.map((row: { video_id: string }) => ({
      video_id: row.video_id,
      order_id: (videoMap.get(row.video_id) as VideoRef | undefined)?.order_id ?? null,
    }));
  } else {
    const { data: stuckUploadRows } = await admin
      .from('uploads')
      .select('id, video_id')
      .eq('status', 'uploading')
      .lt('started_at', stuckCutoff);

    stuckUploadIds = (stuckUploadRows ?? []).map((row: { id: string }) => row.id);
    if (stuckUploadIds.length > 0) {
      const videoIds = (stuckUploadRows ?? []).map((row: { video_id: string }) => row.video_id);
      const { data: videos } = await admin.from('videos').select('id, order_id').in('id', videoIds);
      const videoMap = new Map<string, VideoRef>(
        (videos ?? []).map((video: VideoRef) => [video.id, video])
      );
      stuckVideoRefs = (stuckUploadRows ?? []).map((row: { video_id: string }) => ({
        video_id: row.video_id,
        order_id: (videoMap.get(row.video_id) as VideoRef | undefined)?.order_id ?? null,
      }));
    }
  }

  if (stuckUploadIds.length > 0) {
    await admin
      .from('uploads')
      .update({ status: 'failed', last_error: 'Timed out' })
      .in('id', stuckUploadIds);
  }

  for (const ref of stuckVideoRefs) {
    await admin.from('videos').update({ status: 'failed' }).eq('id', ref.video_id);
    if (ref.order_id) {
      await admin.from('orders').update({ video_status: 'failed' }).eq('id', ref.order_id);
    }
  }

  return {
    expiredLocksReleased: expiredLockIds.length,
    offlineStationsUpdated,
    stuckUploadsFailed: stuckUploadIds.length,
    timestamp: new Date().toISOString(),
  };
}
