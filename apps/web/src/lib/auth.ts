import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api-utils';

type RequestLike = Request | { headers: Headers };

type MembershipRecord = {
  id: string;
  user_id: string;
  org_id: string;
  role: string;
};

function getBearerToken(request?: RequestLike): string | null {
  if (!request) return null;
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

async function getUserFromBearerToken(token: string) {
  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getAuthenticatedUser(request?: RequestLike) {
  try {
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
      return await getUserFromBearerToken(bearerToken);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getMembershipForOrg(userId: string, orgId: string) {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('memberships')
    .select('id, user_id, org_id, role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single();

  return (membership as MembershipRecord | null) ?? null;
}

export async function getUserMemberships(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('memberships')
    .select('role, organizations(*)')
    .eq('user_id', userId);
  return data ?? [];
}

export async function requireAuth(request?: RequestLike) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    throw new ApiError(401, 'Unauthorized');
  }
  return user;
}

export async function requireOrgMember(orgId: string, request?: RequestLike) {
  const user = await requireAuth(request);
  const membership = await getMembershipForOrg(user.id, orgId);

  if (!membership) {
    throw new ApiError(403, 'Forbidden');
  }
  return { user, membership };
}

export async function requireOrgRole(orgId: string, allowedRoles: string[], request?: RequestLike) {
  const { user, membership } = await requireOrgMember(orgId, request);

  if (!allowedRoles.includes(membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { user, membership };
}

async function requireResourceOrg<T extends Record<string, any> & { org_id: string }>(
  table: string,
  id: string,
  columns = '*',
  request?: RequestLike
) {
  const user = await requireAuth(request);
  const admin = createAdminClient();
  const { data: resource, error } = await admin.from(table).select(columns).eq('id', id).single();

  if (error || !resource) {
    throw new ApiError(404, 'Resource not found');
  }

  const membership = await getMembershipForOrg(user.id, (resource as unknown as T).org_id);
  if (!membership) {
    throw new ApiError(403, 'Forbidden');
  }

  return { user, membership, resource: resource as unknown as T, admin };
}

export async function requireStoreAccess(
  storeId: string,
  request?: RequestLike,
  allowedRoles?: string[]
) {
  const context = await requireResourceOrg<
    Record<string, any> & { id: string; org_id: string; url: string }
  >('stores', storeId, '*', request);

  if (allowedRoles && !allowedRoles.includes(context.membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { ...context, store: context.resource };
}

export async function requireStationAccess(
  stationId: string,
  request?: RequestLike,
  allowedRoles?: string[]
) {
  const context = await requireResourceOrg<
    Record<string, any> & { id: string; org_id: string; store_id: string }
  >('stations', stationId, '*', request);

  if (allowedRoles && !allowedRoles.includes(context.membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { ...context, station: context.resource };
}

export async function requireOrderAccess(
  orderId: string,
  request?: RequestLike,
  allowedRoles?: string[]
) {
  const context = await requireResourceOrg<
    Record<string, any> & { id: string; org_id: string; store_id: string }
  >('orders', orderId, '*', request);

  if (allowedRoles && !allowedRoles.includes(context.membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { ...context, order: context.resource };
}

export async function requireVideoAccess(
  videoId: string,
  request?: RequestLike,
  allowedRoles?: string[]
) {
  const context = await requireResourceOrg<
    Record<string, any> & { id: string; org_id: string; store_id: string; order_id: string }
  >('videos', videoId, '*', request);

  if (allowedRoles && !allowedRoles.includes(context.membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { ...context, video: context.resource };
}

export async function requireShipStationAccountAccess(
  accountId: string,
  request?: RequestLike,
  allowedRoles?: string[]
) {
  const context = await requireResourceOrg<Record<string, any> & { id: string; org_id: string }>(
    'shipstation_accounts',
    accountId,
    '*',
    request
  );

  if (allowedRoles && !allowedRoles.includes(context.membership.role)) {
    throw new ApiError(403, 'Forbidden');
  }

  return { ...context, account: context.resource };
}
