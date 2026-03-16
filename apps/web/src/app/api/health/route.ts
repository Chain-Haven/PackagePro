import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getHealthSnapshot } from '@/lib/health';
import { getWebEnv } from '@/lib/env';

export async function GET() {
  const health = await getHealthSnapshot(createAdminClient, getWebEnv);
  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
  });
}
