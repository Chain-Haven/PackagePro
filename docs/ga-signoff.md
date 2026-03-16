# PackagePro GA Signoff

## Local Verification Completed
- `pnpm security:env`
- `pnpm --filter @packagepro/desktop test`
- `pnpm --filter @packagepro/web test`
- `pnpm --filter @packagepro/shipstation test`
- `pnpm --filter @packagepro/desktop type-check`
- `pnpm --filter @packagepro/web type-check`
- `pnpm --filter @packagepro/shipstation type-check`
- IDE diagnostics for desktop, web, shipstation, and docs files are clean

## Code-Level GA Readiness Completed
- On-disk secret guard added and `.env.local` / `.env.production` removed
- API auth boundary tightened for protected routes
- Audit and viewer verification isolation fixed
- Lock conflict handling and explicit order release route added
- Missing RLS migration added for `request_rate_limits` and `shipping_labels`
- ShipStation clients no longer rely on process-local in-memory rate limiting
- Scheduled maintenance routes wired in `vercel.json`
- Health endpoint and status page now reflect live runtime checks
- Desktop release config updated for native PDF printing packaging and signing-friendly defaults

## External Validation Still Required Before GA Ship Decision
- Rotate any secrets that were previously written to local env files
- Apply database migrations in the target Supabase environment
- Confirm Vercel production environment variables are set correctly
- Confirm Vercel cron jobs are active in the production project
- Produce signed desktop artifacts with the required Apple and Windows signing credentials
- Run the smoke test from `docs/release-runbook.md` on at least:
  - one real Windows machine
  - one real macOS machine
- Verify WooCommerce pairing, sync, label print, finalize, email, and unlock flows against a real staging store

## Ship Decision
- `No-Go` until the external validation items above are completed.
- `Go` once:
  - secret rotation is complete
  - migrations are applied
  - cron/health checks are live
  - signed artifacts are produced
  - the staging smoke test passes on real hardware and a real WooCommerce store
