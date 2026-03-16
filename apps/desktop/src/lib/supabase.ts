import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfjdybkjcplxpasrdyum.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmamR5YmtqY3BseHBhc3JkeXVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MjQ3NzgsImV4cCI6MjA4OTIwMDc3OH0.p9vPGCGuPJkXWK_7eMn6kMGepd0pdJP24h6mwTG2D1E';

const BACKEND_URL = 'https://packageprotectpro.com';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, storageKey: 'packagepro-desktop-auth' },
    });
  }
  return supabase;
}

export function getBackendUrl(): string {
  return BACKEND_URL;
}
