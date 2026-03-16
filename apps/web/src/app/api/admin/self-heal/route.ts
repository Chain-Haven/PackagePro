import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { runOperationalSelfHeal } from '@/lib/self-heal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const orgId = body.org_id;
    if (!orgId || typeof orgId !== 'string') {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });
    }

    await requireOrgRole(orgId, ['org_owner', 'org_admin', 'warehouse_manager'], request);
    const admin = createAdminClient();
    const result = await runOperationalSelfHeal(admin, orgId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
