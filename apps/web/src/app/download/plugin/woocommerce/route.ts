import { NextResponse } from 'next/server';
import { getLatestRelease, findAsset, resolveDirectUrl } from '@/lib/downloads';

export const dynamic = 'force-dynamic';

export async function GET() {
  const release = await getLatestRelease();
  if (!release) {
    return NextResponse.json({ error: 'No release found' }, { status: 404 });
  }

  const asset = findAsset(release, 'woocommerce');
  if (!asset) {
    return NextResponse.json({ error: 'WooCommerce plugin not found in latest release' }, { status: 404 });
  }

  const directUrl = await resolveDirectUrl(asset.browser_download_url);

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: directUrl,
      'Content-Disposition': `attachment; filename="${asset.name}"`,
      'Cache-Control': 'no-cache',
    },
  });
}
