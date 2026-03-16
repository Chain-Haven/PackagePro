import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: mapping } = await admin
      .from('shipstation_store_mappings')
      .select('*')
      .eq('id', id)
      .single();

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    const { user } = await requireOrgRole(mapping.org_id, ['org_owner', 'org_admin'], request);
    const { error } = await admin
      .from('shipstation_store_mappings')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: mapping.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'shipstation_mapping_deleted',
      resourceType: 'shipstation_mapping',
      resourceId: id,
      details: { store_id: mapping.store_id },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
