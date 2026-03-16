import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgMember, requireOrgRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const RegisterStationSchema = z.object({
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  machine_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId) return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();

    const { data: stations } = await admin
      .from('stations')
      .select('*')
      .eq('org_id', orgId)
      .order('name');

    return NextResponse.json({ stations: stations ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterStationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { user } = await requireOrgRole(
      parsed.data.org_id,
      ['org_owner', 'org_admin', 'warehouse_manager'],
      request
    );
    const admin = createAdminClient();

    if (parsed.data.machine_id) {
      const { data: existingStation } = await admin
        .from('stations')
        .select('*')
        .eq('org_id', parsed.data.org_id)
        .eq('store_id', parsed.data.store_id)
        .eq('machine_id', parsed.data.machine_id)
        .maybeSingle();

      if (existingStation) {
        return NextResponse.json({ station: existingStation }, { status: 200 });
      }
    }

    const { data: station, error } = await admin
      .from('stations')
      .insert({
        org_id: parsed.data.org_id,
        store_id: parsed.data.store_id,
        name: parsed.data.name,
        machine_id: parsed.data.machine_id || null,
        status: 'offline',
        last_heartbeat: null,
      })
      .select()
      .single();

    if (error || !station) {
      return NextResponse.json({ error: 'Failed to register station' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: parsed.data.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'station_registered',
      resourceType: 'station',
      resourceId: station.id,
      details: { station_name: station.name, machine_id: station.machine_id },
      request,
    });

    return NextResponse.json({ station }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
