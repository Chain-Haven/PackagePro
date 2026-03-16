export type OperationalCheckStatus = 'ok' | 'warning' | 'error';

export interface OperationalHealthCheck {
  code: string;
  label: string;
  status: OperationalCheckStatus;
  message: string;
  fix: string;
  autoFixAvailable: boolean;
}

type OperationalHealthInput = {
  platformStatus: 'ok' | 'degraded';
  supabaseStatus: 'ok' | 'error';
  cronStatus: 'configured' | 'missing';
  staleLockCount: number;
  failedUploadCount: number;
  failedEmailCount: number;
  unpairedStoreCount: number;
};

export function buildOperationalHealthChecks(
  input: OperationalHealthInput
): OperationalHealthCheck[] {
  const checks: OperationalHealthCheck[] = [
    {
      code: 'PLATFORM_HEALTH',
      label: 'Platform health',
      status: input.platformStatus === 'ok' ? 'ok' : 'error',
      message:
        input.platformStatus === 'ok'
          ? 'Core platform checks are passing.'
          : 'The platform health endpoint reported a degraded state.',
      fix: 'Review the failing system checks below before shipping changes.',
      autoFixAvailable: false,
    },
    {
      code: 'SUPABASE_CONNECTIVITY',
      label: 'Supabase connectivity',
      status: input.supabaseStatus === 'ok' ? 'ok' : 'error',
      message:
        input.supabaseStatus === 'ok'
          ? 'Database connectivity looks healthy.'
          : 'The app cannot complete a basic Supabase connectivity check.',
      fix: 'Verify production Supabase credentials and project availability.',
      autoFixAvailable: false,
    },
    {
      code: 'CRON_CONFIGURATION',
      label: 'Maintenance cron',
      status: input.cronStatus === 'configured' ? 'ok' : 'error',
      message:
        input.cronStatus === 'configured'
          ? 'Maintenance cron configuration is present.'
          : 'The production CRON_SECRET or scheduled jobs are missing.',
      fix: 'Configure Vercel cron and CRON_SECRET before relying on background maintenance.',
      autoFixAvailable: false,
    },
  ];

  if (input.staleLockCount > 0) {
    checks.push({
      code: 'STALE_LOCKS',
      label: 'Expired order locks',
      status: 'warning',
      message: `${input.staleLockCount} expired locks still need cleanup.`,
      fix: 'Run self-heal to release stale locks and let stations resume work.',
      autoFixAvailable: true,
    });
  }

  if (input.failedUploadCount > 0) {
    checks.push({
      code: 'FAILED_UPLOADS',
      label: 'Failed uploads',
      status: 'warning',
      message: `${input.failedUploadCount} orders are marked with failed video uploads.`,
      fix: 'Run self-heal, then retry affected desktop uploads from the queue.',
      autoFixAvailable: true,
    });
  }

  if (input.failedEmailCount > 0) {
    checks.push({
      code: 'FAILED_EMAILS',
      label: 'Failed email deliveries',
      status: 'warning',
      message: `${input.failedEmailCount} customer emails failed recently.`,
      fix: 'Review email events and retry or correct the store email configuration.',
      autoFixAvailable: false,
    });
  }

  if (input.unpairedStoreCount > 0) {
    checks.push({
      code: 'UNPAIRED_STORES',
      label: 'Stores awaiting pairing',
      status: 'warning',
      message: `${input.unpairedStoreCount} connected stores are not paired to the plugin yet.`,
      fix: 'Complete WooCommerce plugin pairing before using those stores at the bench.',
      autoFixAvailable: false,
    });
  }

  return checks;
}
