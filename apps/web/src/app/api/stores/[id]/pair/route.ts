import { NextRequest, NextResponse } from 'next/server';
import { requireStoreAccess } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { buildExternalUrl, enforceRateLimit, getEncryptionKey } from '@/lib/security';
import { getWebAppUrl } from '@/lib/env';
import { writeAuditLog } from '@/lib/audit';
import {
  encryptIfNeeded,
  PAIRING_RATE_LIMIT_PER_HOUR,
  PAIRING_RATE_LIMIT_WINDOW_SECONDS,
} from '@packagepro/shared';
import { z } from 'zod';

const PairStoreBodySchema = z.object({
  pairing_code: z.string().trim().min(6).max(64),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: storeId } = await params;
    const { store, user, admin } = await requireStoreAccess(storeId, request, [
      'org_owner',
      'org_admin',
    ]);

    await enforceRateLimit(
      request,
      'store-pair',
      `${user.id}:${storeId}`,
      PAIRING_RATE_LIMIT_PER_HOUR,
      PAIRING_RATE_LIMIT_WINDOW_SECONDS
    );

    const body = await request.json();
    const parsedBody = PairStoreBodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    if (!store.url) {
      return NextResponse.json({ error: 'Store URL not set' }, { status: 400 });
    }

    const backendUrl = getWebAppUrl();
    const pluginPairUrl = buildExternalUrl(store.url, '/wp-json/packagepro/v1/pair', {
      allowHttpLocalhost: process.env.NODE_ENV !== 'production',
    });

    let pluginResponse: Response;
    try {
      pluginResponse = await fetch(pluginPairUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairing_code: parsedBody.data.pairing_code.toUpperCase(),
          backend_url: backendUrl,
          store_id: storeId,
        }),
      });
    } catch {
      return NextResponse.json(
        {
          error: `Could not reach plugin at ${store.url}. Make sure the PackagePro plugin is installed and the store URL is correct.`,
        },
        { status: 502 }
      );
    }

    if (!pluginResponse.ok) {
      const errorBody = await pluginResponse.json().catch(() => ({}));
      const msg =
        (errorBody as { message?: string }).message ||
        (errorBody as { code?: string }).code ||
        `Plugin returned ${pluginResponse.status}`;
      return NextResponse.json({ error: `Pairing rejected by plugin: ${msg}` }, { status: 400 });
    }

    const pluginData = (await pluginResponse.json()) as {
      success?: boolean;
      consumer_key?: string;
      consumer_secret?: string;
      webhook_secret?: string;
      store_url?: string;
      store_name?: string;
    };

    if (!pluginData.success) {
      return NextResponse.json({ error: 'Plugin pairing failed' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {
      paired_at: new Date().toISOString(),
      sync_status: 'synced',
      pairing_code: null,
    };
    const encryptionKey = getEncryptionKey();

    if (pluginData.consumer_key) {
      updateFields.consumer_key_encrypted = encryptIfNeeded(pluginData.consumer_key, encryptionKey);
    }
    if (pluginData.consumer_secret) {
      updateFields.consumer_secret_encrypted = encryptIfNeeded(
        pluginData.consumer_secret,
        encryptionKey
      );
    }
    if (pluginData.webhook_secret) {
      updateFields.webhook_secret = encryptIfNeeded(pluginData.webhook_secret, encryptionKey);
    }

    const { error: updateError } = await admin
      .from('stores')
      .update(updateFields)
      .eq('id', storeId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Store updated on plugin but failed to save locally' },
        { status: 500 }
      );
    }

    await writeAuditLog({
      admin,
      orgId: store.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'store_paired',
      resourceType: 'store',
      resourceId: storeId,
      details: { store_name: pluginData.store_name ?? store.name },
      request,
    });

    return NextResponse.json({
      success: true,
      paired_at: updateFields.paired_at,
      store_name: pluginData.store_name,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
