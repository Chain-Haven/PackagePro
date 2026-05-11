import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'ENCRYPTION_KEY must be 32 bytes encoded as hex'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

type WebEnv = z.infer<typeof envSchema>;

let cachedEnv: WebEnv | null = null;

export function getWebEnv(): WebEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `INVALID_ENV:${parsed.error.issues.map((issue) => issue.path.join('.') + ' ' + issue.message).join(', ')}`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getWebAppUrl(): string {
  const env = getWebEnv();
  if (env.NEXT_PUBLIC_APP_URL) {
    return env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }

  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  throw new Error('INVALID_ENV:NEXT_PUBLIC_APP_URL or VERCEL_URL is required');
}

export function isProductionEnv(): boolean {
  return getWebEnv().NODE_ENV === 'production';
}
