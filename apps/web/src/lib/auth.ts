import { createClient } from '@/lib/supabase/server';

export async function getAuthenticatedUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getUserMemberships(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('memberships')
    .select('role, organizations(*)')
    .eq('user_id', userId);
  return data ?? [];
}

export async function requireAuth() {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireOrgMember(orgId: string) {
  const user = await requireAuth();
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single();

  if (!membership) {
    throw new Error('FORBIDDEN');
  }
  return { user, membership };
}
