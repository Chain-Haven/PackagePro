type ReadEnv = () => {
  CRON_SECRET?: string;
};

export async function getHealthSnapshot(createAdminClient: () => any, readEnv: ReadEnv) {
  const checks = {
    supabase: 'ok' as 'ok' | 'error',
    cron: readEnv().CRON_SECRET ? ('configured' as const) : ('missing' as const),
  };

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from('stores')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) {
      checks.supabase = 'error';
    }
  } catch {
    checks.supabase = 'error';
  }

  return {
    status: checks.supabase === 'ok' && checks.cron === 'configured' ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  };
}
