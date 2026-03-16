# PackagePro Release Runbook

## Secrets
- Confirm `pnpm security:env` passes before any build or deploy.
- Store runtime secrets only in Vercel project settings and the Supabase dashboard.
- Rotate any credential that was ever written to `.env.local` or `.env.production` before the first GA release.

## Web Deploy
- Verify Vercel production env includes:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ENCRYPTION_KEY`
  - `CRON_SECRET`
  - `NEXT_PUBLIC_APP_URL`
- Confirm Vercel cron jobs are enabled for:
  - `/api/admin/reconcile`
  - `/api/admin/retention`

## Desktop Build
- For macOS signing and notarization, provide:
  - `APPLE_ID`
  - `APPLE_APP_SPECIFIC_PASSWORD`
  - `APPLE_TEAM_ID`
  - `CSC_LINK`
  - `CSC_KEY_PASSWORD`
- For Windows signing, provide:
  - `CSC_LINK`
  - `CSC_KEY_PASSWORD`
- Build desktop artifacts with `pnpm --filter @packagepro/desktop package`.

## Pre-Release Checks
- Run:
  - `pnpm --filter @packagepro/desktop test`
  - `pnpm --filter @packagepro/web test`
  - `pnpm --filter @packagepro/shipstation test`
  - `pnpm --filter @packagepro/desktop type-check`
  - `pnpm --filter @packagepro/web type-check`
- Confirm `/api/health` reports `status: ok`.
- Confirm the public status page reflects the current health snapshot.

## Smoke Test
- Pair a WooCommerce store.
- Sync orders from WooCommerce.
- Lock an order from the desktop app.
- Record, upload, finalize, and confirm the lock is released.
- Create and print a label on Windows and macOS.
- Verify the Woo order receives the video attachment and the customer email.

## Go/No-Go
- No on-disk production secrets remain.
- Web production health is `ok`.
- Cron maintenance is configured and running.
- Desktop artifacts are signed for the target platform.
- End-to-end smoke tests pass on at least one real Windows machine and one real macOS machine.
