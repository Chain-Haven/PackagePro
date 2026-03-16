import { describe, expect, it } from 'vitest';
import { diagnoseDashboardIssue } from '../dashboard-health';

describe('diagnoseDashboardIssue', () => {
  it('reports missing backend URL with auto-fix available', () => {
    const issue = diagnoseDashboardIssue({ missingBackendUrl: true });

    expect(issue.code).toBe('CONFIG_BACKEND_URL_MISSING');
    expect(issue.autoFixAvailable).toBe(true);
  });

  it('reports missing auth session as a sign-in problem', () => {
    const issue = diagnoseDashboardIssue({ missingSession: true });

    expect(issue.code).toBe('AUTH_SESSION_MISSING');
    expect(issue.fixSteps[0]).toMatch(/sign in/i);
  });

  it('classifies network fetch failures separately from generic queue errors', () => {
    const issue = diagnoseDashboardIssue({
      rawErrorMessage: 'TypeError: Failed to fetch',
      failedCheck: 'orders',
    });

    expect(issue.code).toBe('NETWORK_UNAVAILABLE');
  });
});
