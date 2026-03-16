import { describe, expect, it, vi } from 'vitest';
import { getHealthSnapshot } from '../health';

describe('getHealthSnapshot', () => {
  it('reports healthy dependencies when env and database checks succeed', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(async () => ({ error: null })),
        })),
      })),
    };

    const result = await getHealthSnapshot(
      () => admin as never,
      () => ({ CRON_SECRET: '0123456789abcdef' })
    );

    expect(result.status).toBe('ok');
    expect(result.checks.supabase).toBe('ok');
    expect(result.checks.cron).toBe('configured');
  });
});
