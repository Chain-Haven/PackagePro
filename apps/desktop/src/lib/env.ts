function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'VITE_BACKEND_URL'): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing required desktop environment variable: ${name}`);
  }
  return value;
}

export function getDesktopSupabaseUrl(): string {
  return requireEnv('VITE_SUPABASE_URL');
}

export function getDesktopSupabaseAnonKey(): string {
  return requireEnv('VITE_SUPABASE_ANON_KEY');
}

export function getDesktopBackendUrl(): string {
  return requireEnv('VITE_BACKEND_URL').replace(/\/+$/, '');
}
