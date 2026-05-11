import { createClient } from '@supabase/supabase-js';
import { getWebEnv } from '@/lib/env';

export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = getWebEnv();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
