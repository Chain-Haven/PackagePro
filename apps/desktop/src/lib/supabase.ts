import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getDesktopBackendUrl, getDesktopSupabaseAnonKey, getDesktopSupabaseUrl } from './env';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(getDesktopSupabaseUrl(), getDesktopSupabaseAnonKey(), {
      auth: { persistSession: true, storageKey: 'packagepro-desktop-auth' },
    });
  }
  return supabase;
}

export function getBackendUrl(): string {
  return getDesktopBackendUrl();
}
