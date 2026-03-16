import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOrgMember, requireOrgRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { writeAuditLog } from '@/lib/audit';
import { getEncryptionKey } from '@/lib/security';
import { encrypt } from '@packagepro/shared';
import { z } from 'zod';

const CreateAccountSchema = z.object({
  org_id: z.string().uuid(),
  label: z.string().min(1).max(255),
  api_key: z.string().min(1),
  api_secret: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('org_id');
    if (!orgId)
      return NextResponse.json({ error: 'org_id required' }, { status: 400 });

    await requireOrgMember(orgId, request);
    const admin = createAdminClient();

    const { data: accounts } = await admin
      .from('shipstation_accounts')
      .select('id, org_id, label, connection_status, last_tested_at, created_at')
      .eq('org_id', orgId);

    return NextResponse.json({ accounts: accounts ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user } = await requireOrgRole(
      parsed.data.org_id,
      ['org_owner', 'org_admin'],
      request
    );
    const admin = createAdminClient();
    const encryptionKey = getEncryptionKey();

    const encrypted = encrypt(
      `${parsed.data.api_key}:${parsed.data.api_secret}`,
      encryptionKey
    );

    const { data: account, error } = await admin
      .from('shipstation_accounts')
      .insert({
        org_id: parsed.data.org_id,
        label: parsed.data.label,
        api_key_encrypted: encrypted,
        connection_status: 'untested',
      })
      .select('id, org_id, label, connection_status, created_at')
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    await writeAuditLog({
      admin,
      orgId: parsed.data.org_id,
      actorId: user.id,
      actorType: 'user',
      action: 'shipstation_account_created',
      resourceType: 'shipstation_account',
      resourceId: account.id,
      details: { label: account.label },
      request,
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
