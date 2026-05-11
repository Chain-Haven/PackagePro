import { describe, expect, it } from 'vitest';
import { hasBearerAuthorization, isPublicApiPath, isPublicPath } from '../middleware-auth';

describe('middleware auth helpers', () => {
  it('only treats specific API prefixes as public', () => {
    expect(isPublicApiPath('/api/health')).toBe(true);
    expect(isPublicApiPath('/api/webhooks/woo/store')).toBe(true);
    expect(isPublicApiPath('/api/viewer/token')).toBe(true);
    expect(isPublicApiPath('/api/orders')).toBe(false);
  });

  it('keeps regular public pages accessible', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/download/windows')).toBe(true);
    expect(isPublicPath('/dashboard')).toBe(false);
  });

  it('detects bearer authorization headers', () => {
    expect(hasBearerAuthorization('Bearer token-123')).toBe(true);
    expect(hasBearerAuthorization('Basic abc')).toBe(false);
    expect(hasBearerAuthorization(null)).toBe(false);
  });
});
