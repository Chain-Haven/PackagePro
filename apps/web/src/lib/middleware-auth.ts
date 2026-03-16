const PUBLIC_PAGE_PREFIXES = [
  '/login',
  '/signup',
  '/view',
  '/docs',
  '/download',
  '/changelog',
  '/status',
  '/privacy',
  '/terms',
];

const PUBLIC_API_PREFIXES = [
  '/api/health',
  '/api/webhooks/',
  '/api/viewer/',
];

export function isPublicPath(pathname: string) {
  return pathname === '/' || PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function hasBearerAuthorization(authorization: string | null) {
  return Boolean(authorization?.startsWith('Bearer '));
}
