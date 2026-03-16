# PackagePro GA Verification Checklist

## Security
- `pnpm security:env` passes.
- `.env.local` and `.env.production` are absent.
- API middleware no longer treats all `/api/*` routes as public.
- Audit and viewer verification flows are scoped to the correct tenant and verification rules.

## Fulfillment
- Locking an order returns `409` on a concurrent claim instead of a generic server error.
- Canceling or finishing a desktop packing session releases the order lock.
- Failed uploads can be retried from the current packing screen and from the upload queue.
- Woo order sync, video finalize, attach-video, and customer email flows all succeed in staging.

## Database
- `request_rate_limits` RLS is enabled and service-role only.
- `shipping_labels` RLS is enabled and org members can only read their own labels.
- ShipStation clients no longer depend on process-local memory for rate limiting behavior.

## Operations
- Vercel cron jobs are configured for `/api/admin/reconcile` and `/api/admin/retention`.
- `/api/health` returns `200` and `status: ok`.
- The public status page reflects live health data.

## Desktop
- Windows packaging includes the unpacked `pdf-to-printer` dependency path.
- macOS build uses hardened runtime.
- Windows executable signing is enabled in Electron Builder config.
- Setup wizard can reconnect to an existing station on the same machine.

## Ship Decision
- All automated tests and type checks pass.
- One Windows machine and one macOS machine pass the smoke test.
- Secret rotation and deployment-secret migration have been completed outside the repo.
