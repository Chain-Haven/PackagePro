import { createHash } from 'crypto';
import { ApiError } from '@/lib/api-utils';
import { consumeRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { getWebEnv, isProductionEnv } from '@/lib/env';

type ExternalUrlOptions = {
  allowHttpLocalhost?: boolean;
  requirePathlessBase?: boolean;
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[::1\]$/i,
  /^::1$/i,
];

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function hashRateLimitKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function normalizeExternalUrl(rawUrl: string, options: ExternalUrlOptions = {}): string {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ApiError(400, 'Invalid URL');
  }

  const isLocalhost = isPrivateHostname(parsed.hostname);
  const allowHttpLocalhost = options.allowHttpLocalhost && isLocalhost;

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && allowHttpLocalhost)) {
    throw new ApiError(400, 'Only HTTPS URLs are allowed');
  }

  if (isProductionEnv() && isLocalhost) {
    throw new ApiError(400, 'Private or localhost URLs are not allowed');
  }

  if (options.requirePathlessBase && parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new ApiError(400, 'URL must not contain a path');
  }

  parsed.hash = '';
  return parsed.toString().replace(/\/+$/, '');
}

export function buildExternalUrl(
  baseUrl: string,
  pathname: string,
  options: ExternalUrlOptions = {}
): string {
  const normalizedBase = normalizeExternalUrl(baseUrl, options);
  return new URL(pathname, `${normalizedBase}/`).toString();
}

export async function requireCronAccess(request: Request) {
  const { CRON_SECRET } = getWebEnv();
  if (!CRON_SECRET) {
    throw new ApiError(503, 'CRON_SECRET is not configured');
  }

  const providedSecret =
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-packagepro-cron-secret') ||
    null;

  if (providedSecret !== CRON_SECRET) {
    throw new ApiError(401, 'Unauthorized');
  }
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const result = await consumeRateLimit(
    scope,
    hashRateLimitKey(`${scope}:${subject}:${ip}`),
    limit,
    windowSeconds
  );

  if (!result.allowed) {
    throw new ApiError(429, 'Rate limit exceeded', { reset_at: result.resetAt });
  }

  return result;
}

export function getEncryptionKey(): string {
  return getWebEnv().ENCRYPTION_KEY;
}
