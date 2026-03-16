# PackagePro Secret Exposure Response

This document exists because production-like secrets were previously reported as present on disk.
Treat that event as a live security incident even if the current worktree no longer contains the
offending file.

## Immediate Actions

1. Rotate `SUPABASE_SERVICE_ROLE_KEY`.
2. Rotate `NEXT_PUBLIC_SUPABASE_ANON_KEY` if it was ever bundled from a compromised environment.
3. Rotate `ENCRYPTION_KEY`.
4. Rotate every WooCommerce API key issued by the pairing flow.
5. Rotate every ShipStation API credential stored for connected organizations.
6. Rotate every Woo/plugin webhook secret.
7. Re-pair stores if their Woo credentials or webhook secret changed.
8. Invalidate and re-issue customer viewer links for sensitive orders if token material may have leaked.

## Repository Rules

- Never commit `.env.production` or any production env file.
- Use [.env.example](../.env.example) for shape only; never place live credentials there.
- Desktop builds must use `VITE_*` environment variables injected at build/runtime.
- Web services must fail closed when required secrets are missing or malformed.

## Verification Checklist

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
  `ENCRYPTION_KEY` are supplied through deployment secrets, not committed files.
- Desktop `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BACKEND_URL` are injected from
  the environment, not hardcoded in source.
- Newly stored WooCommerce and ShipStation credentials are encrypted at rest.
- Webhook secrets are never returned to browser clients.
- Cron-only endpoints require `CRON_SECRET`.
