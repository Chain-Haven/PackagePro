import { ApiError } from '@/lib/api-utils';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

export async function consumeRateLimit(
  scope: string,
  subjectKey: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_scope: scope,
    p_subject_key: subjectKey,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new ApiError(503, 'Rate limiter unavailable');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new ApiError(503, 'Rate limiter unavailable');
  }

  return {
    allowed: Boolean(row.allowed),
    remaining: Number(row.remaining ?? 0),
    resetAt: String(row.reset_at),
  };
}
