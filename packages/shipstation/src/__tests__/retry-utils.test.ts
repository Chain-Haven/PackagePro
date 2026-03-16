import { describe, expect, it } from 'vitest';
import { getRetryDelayMs } from '../retry-utils';

describe('getRetryDelayMs', () => {
  it('prefers the Retry-After header when present', () => {
    const headers = new Headers({ 'Retry-After': '7' });
    expect(getRetryDelayMs(headers, 5, 0)).toBe(7000);
  });

  it('falls back to the provided default delay with jitter when Retry-After is missing', () => {
    const delay = getRetryDelayMs(new Headers(), 5, 250);
    expect(delay).toBe(5250);
  });
});
