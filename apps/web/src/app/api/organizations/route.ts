import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, getUserMemberships } from '@/lib/auth';
import { handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const memberships = await getUserMemberships(user.id);
    return NextResponse.json({ organizations: memberships.map((m: any) => ({
      ...m.organizations,
      role: m.role,
    }))});
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = CreateOrgSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = await createClient();

    await supabase.from('users').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
    });

    const org = {
      id: crypto.randomUUID(),
      name: parsed.data.name,
      slug: parsed.data.slug,
    };

    const { error: orgError } = await supabase
      .from('organizations')
      .insert(org);

    if (orgError?.code === '23505') {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }

    if (orgError || !org) {
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const { error: memError } = await supabase
      .from('memberships')
      .insert({ user_id: user.id, org_id: org.id, role: 'org_owner' });

    if (memError) {
      return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
    }

    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
