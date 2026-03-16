import { NextRequest, NextResponse } from 'next/server';
import { requireVideoAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { STORAGE_BUCKET } from '@packagepro/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { video, user, admin } = await requireVideoAccess(videoId, request);

    if (!video.storage_path) {
      return NextResponse.json({ error: 'Video is missing a storage path' }, { status: 409 });
    }

    if (video.status === 'ready') {
      return NextResponse.json({ error: 'Video upload is already finalized' }, { status: 409 });
    }

    const { data: signedUrl, error: signError } = await admin
      .storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(video.storage_path);

    if (signError || !signedUrl) {
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    await admin.from('uploads').insert({
      video_id: videoId,
      station_id: video.station_id,
      status: 'uploading',
      started_at: new Date().toISOString(),
    });

    await writeAuditLog({
      admin,
      orgId: video.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'video_upload_url_refreshed',
      resourceType: 'video',
      resourceId: videoId,
      details: {
        station_id: video.station_id ?? null,
      },
      request,
    });

    return NextResponse.json({
      video_id: videoId,
      upload_url: signedUrl.signedUrl,
      storage_path: video.storage_path,
      token: signedUrl.token,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
