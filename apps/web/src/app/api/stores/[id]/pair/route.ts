import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { pairing_code } = body;

    if (!pairing_code || typeof pairing_code !== 'string') {
      return NextResponse.json({ error: 'pairing_code is required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    if (!store.url) {
      return NextResponse.json({ error: 'Store URL not set' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_APP_URL
      || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
      || 'https://packageprotectpro.com';

    const pluginPairUrl = `${store.url.replace(/\/+$/, '')}/wp-json/packagepro/v1/pair`;

    let pluginResponse: Response;
    try {
      pluginResponse = await fetch(pluginPairUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairing_code: pairing_code.toUpperCase(),
          backend_url: backendUrl,
          store_id: storeId,
        }),
      });
    } catch {
      return NextResponse.json(
        { error: `Could not reach plugin at ${store.url}. Make sure the PackagePro plugin is installed and the store URL is correct.` },
        { status: 502 },
      );
    }

    if (!pluginResponse.ok) {
      const errorBody = await pluginResponse.json().catch(() => ({}));
      const msg = (errorBody as { message?: string }).message
        || (errorBody as { code?: string }).code
        || `Plugin returned ${pluginResponse.status}`;
      return NextResponse.json({ error: `Pairing rejected by plugin: ${msg}` }, { status: 400 });
    }

    const pluginData = await pluginResponse.json() as {
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

    if (pluginData.consumer_key) {
      updateFields.consumer_key_encrypted = pluginData.consumer_key;
    }
    if (pluginData.consumer_secret) {
      updateFields.consumer_secret_encrypted = pluginData.consumer_secret;
    }
    if (pluginData.webhook_secret) {
      updateFields.webhook_secret = pluginData.webhook_secret;
    }

    const { error: updateError } = await supabase
      .from('stores')
      .update(updateFields)
      .eq('id', storeId);

    if (updateError) {
      return NextResponse.json({ error: 'Store updated on plugin but failed to save locally' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      paired_at: updateFields.paired_at,
      store_name: pluginData.store_name,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
