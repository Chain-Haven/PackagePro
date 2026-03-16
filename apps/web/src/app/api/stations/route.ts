import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth';
import { z } from 'zod';

const RegisterStationSchema = z.object({
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  machine_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = request.nextUrl.searchParams.get('org_id');
  if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: stations } = await admin
    .from('stations')
    .select('*')
    .eq('org_id', orgId)
    .order('name');

  return NextResponse.json({ stations: stations ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = RegisterStationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('org_id', parsed.data.org_id)
    .single();

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: station, error } = await admin
    .from('stations')
    .insert({
      org_id: parsed.data.org_id,
      store_id: parsed.data.store_id,
      name: parsed.data.name,
      machine_id: parsed.data.machine_id || null,
      status: 'online',
      last_heartbeat: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !station) {
    return NextResponse.json({ error: 'Failed to register station' }, { status: 500 });
  }

  return NextResponse.json({ station }, { status: 201 });
}
