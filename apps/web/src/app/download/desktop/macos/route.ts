import { NextResponse } from 'next/server';
import { getDownloadUrl } from '@/lib/downloads';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = await getDownloadUrl('macos');
  if (!url) {
    return NextResponse.redirect(
      new URL('https://github.com/Chain-Haven/PackagePro/releases/latest'),
    );
  }
  return NextResponse.redirect(url);
}
