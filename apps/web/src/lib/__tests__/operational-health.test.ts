import { describe, expect, it } from 'vitest';
import { buildOperationalHealthChecks } from '../operational-health';

describe('buildOperationalHealthChecks', () => {
  it('marks stale locks and failed uploads as auto-fixable warnings', () => {
    const checks = buildOperationalHealthChecks({
      platformStatus: 'degraded',
      supabaseStatus: 'ok',
      cronStatus: 'configured',
      staleLockCount: 2,
      failedUploadCount: 1,
      failedEmailCount: 0,
      unpairedStoreCount: 0,
    });

    expect(checks.find((check) => check.code === 'STALE_LOCKS')?.autoFixAvailable).toBe(true);
    expect(checks.find((check) => check.code === 'FAILED_UPLOADS')?.autoFixAvailable).toBe(true);
  });
});
