export function getRetryDelayMs(
  headers: Headers,
  fallbackSeconds = 5,
  jitterMs = 0
) {
  const retryAfter = Number.parseInt(headers.get('Retry-After') || '', 10);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }

  return fallbackSeconds * 1000 + Math.max(jitterMs, 0);
}
