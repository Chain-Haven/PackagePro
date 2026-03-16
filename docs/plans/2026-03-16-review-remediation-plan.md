# Review Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the verified review gaps in desktop uploads/camera flow, web API order resolution and reconciliation, ShipStation account routing, Windows download messaging, and WooCommerce webhook durability.

**Architecture:** Keep the work staged and test-first. Add narrow, pure helpers where possible so the high-risk behavior can be verified without full UI or WordPress runtime bootstraps. Preserve the current product flow, but extend it for explicit multi-account ShipStation mappings and refreshable upload credentials that survive offline retry windows.

**Tech Stack:** TypeScript, React, Electron, Next.js route handlers, Supabase, Zod, WordPress PHP, WP-Cron, Vitest, PHP CLI tests

---

### Task 1: Add Test Seams And Test Runners

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/web/package.json`
- Create: `apps/desktop/src/lib/__tests__/upload-queue.test.ts`
- Create: `apps/desktop/src/lib/__tests__/camera-utils.test.ts`
- Create: `apps/web/src/lib/__tests__/orders-resolve.test.ts`
- Create: `apps/web/src/lib/__tests__/reconcile-orders.test.ts`
- Create: `plugins/woocommerce/packagepro-fulfillment/tests/webhooks-test.php`

**Step 1: Write the failing tests**
- Add desktop tests for:
  - refreshing upload credentials on expired upload errors
  - keeping persisted queue payloads free of upload tokens
  - sorting rates without mutating the original array
  - camera constraint fallback and recorder mime selection helpers
- Add web tests for:
  - building a fresh order lookup query per scan branch
  - chunking reconcile upserts into batched payloads
- Add a PHP CLI test for:
  - webhook queue payload creation and idempotency key generation

**Step 2: Run tests to verify they fail**
- Run: `pnpm --filter @packagepro/desktop test`
- Run: `pnpm --filter @packagepro/web test`
- Run: `php plugins/woocommerce/packagepro-fulfillment/tests/webhooks-test.php`
- Expected: each new test file fails because the helpers and behaviors do not exist yet.

**Step 3: Add the minimal test runner wiring**
- Add `vitest` scripts and dev dependency usage in desktop and web packages.
- Keep tests on pure helpers to avoid needing a browser renderer test harness.

**Step 4: Re-run tests**
- Confirm the tests still fail for missing behavior, not for harness/config issues.

### Task 2: Refreshable Upload Credentials And Safer Queue Persistence

**Files:**
- Modify: `apps/desktop/src/lib/upload-queue.ts`
- Modify: `apps/desktop/src/lib/api.ts`
- Modify: `apps/desktop/src/screens/PackingScreen.tsx`
- Modify: `apps/desktop/electron/main.ts`
- Create: `apps/desktop/src/lib/upload-credentials-store.ts`
- Create: `apps/web/src/app/api/videos/[id]/refresh-upload-url/route.ts`
- Create: `apps/web/src/lib/videos/upload-credentials.ts`
- Test: `apps/desktop/src/lib/__tests__/upload-queue.test.ts`

**Step 1: Write the failing desktop/web tests**
- Cover:
  - expired upload errors trigger a refresh request
  - refreshed credentials replace stale credentials before retry
  - persisted queue payload excludes live upload tokens
  - manual retry also refreshes when necessary

**Step 2: Run the tests to confirm RED**
- Run only the new upload queue test file in desktop and the new route/helper tests in web.

**Step 3: Implement minimal behavior**
- Add a backend route that verifies access to the existing video record and returns a fresh signed upload URL/token for the same storage path.
- Add a desktop API helper to call the refresh route.
- Move upload-token persistence out of renderer localStorage:
  - persist queue metadata in renderer
  - persist the live upload token/URL in encrypted main-process config/state or re-fetch it on hydration
- Detect expired upload credential failures and refresh before the next retry.

**Step 4: Re-run the focused tests**
- Confirm they pass.

**Step 5: Run a small regression slice**
- Run: `pnpm --filter @packagepro/desktop test`
- Run: `pnpm --filter @packagepro/web test`

### Task 3: Fix Order Scan Resolution And Reconcile Batching

**Files:**
- Modify: `apps/web/src/app/api/orders/resolve/route.ts`
- Modify: `apps/web/src/app/api/webhooks/woo/[storeId]/reconcile/route.ts`
- Create: `apps/web/src/lib/orders/resolve-order-scan.ts`
- Create: `apps/web/src/lib/orders/reconcile-orders.ts`
- Test: `apps/web/src/lib/__tests__/orders-resolve.test.ts`
- Test: `apps/web/src/lib/__tests__/reconcile-orders.test.ts`

**Step 1: Write the failing tests**
- Ensure each scan branch gets a fresh builder with no stacked filters.
- Ensure reconcile transforms an order array into one or more batched upsert payloads.

**Step 2: Run the web tests to verify RED**

**Step 3: Implement minimal code**
- Extract a small `makeBaseQuery()`/lookup helper so each lookup path starts from a clean builder.
- Replace sequential reconcile upserts with a bulk upsert or chunked bulk upserts.

**Step 4: Re-run the focused tests**
- Confirm the new tests pass.

**Step 5: Run the web package tests**
- Run: `pnpm --filter @packagepro/web test`

### Task 4: Implement True Multi-Account ShipStation Store Routing

**Files:**
- Modify: `apps/web/src/app/api/shipstation/labels/route.ts`
- Modify: `apps/web/src/app/api/shipstation/labels/[id]/void/route.ts`
- Modify: `apps/web/src/app/api/orders/[id]/route.ts`
- Modify: `apps/web/src/app/api/shipstation/mappings/route.ts`
- Modify: `apps/web/src/components/settings/shipstation-settings.tsx`
- Modify: `apps/desktop/src/components/ShippingPanel.tsx`
- Create: `apps/web/src/lib/shipstation/select-store-mapping.ts`
- Create: `apps/web/src/lib/__tests__/shipstation-mapping.test.ts`

**Step 1: Write the failing tests**
- Requested `account_id` selects the matching mapping for label creation.
- Missing mapping for a requested account returns a clear conflict/error.
- Settings/mapping helpers allow multiple mappings for a store instead of deleting all prior rows.

**Step 2: Run the tests to verify RED**

**Step 3: Implement minimal code**
- Select the mapping that matches the requested `account_id`.
- Preserve existing mappings for other accounts on the same store.
- Update the desktop/UI copy so the account chooser represents real supported behavior.

**Step 4: Re-run the tests**
- Confirm the mapping-selection tests pass.

### Task 5: Desktop Camera Compatibility And ShippingPanel Render Safety

**Files:**
- Modify: `apps/desktop/src/hooks/useCamera.ts`
- Modify: `apps/desktop/src/hooks/useRecording.ts`
- Modify: `apps/desktop/src/components/ShippingPanel.tsx`
- Modify: `apps/desktop/src/screens/PackingScreen.tsx`
- Create: `apps/desktop/src/lib/camera-utils.ts`
- Test: `apps/desktop/src/lib/__tests__/camera-utils.test.ts`
- Test: `apps/desktop/src/lib/__tests__/shipping-panel.test.ts`

**Step 1: Write the failing tests**
- Device refresh helper responds to `devicechange`.
- Constraint builder falls back from `exact` device to generic video constraints.
- Recorder mime helper chooses the first supported WebM variant.
- Rate sorting helper returns a sorted copy without mutating the original array.

**Step 2: Run the desktop tests to verify RED**

**Step 3: Implement minimal code**
- Add device enumeration refresh and a `devicechange` listener.
- Add getUserMedia fallback when the selected device cannot be opened.
- Add `MediaRecorder.isTypeSupported()` fallback chain.
- Replace render-time `rates.sort(...)` with a memoized copied sort.
- Surface camera errors in `PackingScreen` if needed while touching the flow.

**Step 4: Re-run the desktop tests**
- Confirm the focused tests pass.

### Task 6: Align Windows ZIP Downloads And Fix Domain Typos

**Files:**
- Modify: `apps/web/src/app/download/page.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/lib/downloads.ts`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-admin.php`
- Modify: `apps/desktop/src/screens/LoginScreen.tsx`
- Create: `apps/web/src/lib/constants.ts`
- Create: `apps/web/src/lib/__tests__/downloads.test.ts`

**Step 1: Write the failing tests**
- Windows asset discovery resolves ZIP artifacts.
- Download copy helpers label the Windows package as ZIP.

**Step 2: Run the tests to verify RED**

**Step 3: Implement minimal code**
- Update all public Windows download text/button labels/instructions to ZIP.
- Move public site domain strings to a shared constant where practical.
- Replace stale `packageprotectpro.com` copy with the PackagePro domain in plugin/admin and desktop login copy.

**Step 4: Re-run the tests**
- Confirm the download/domain tests pass.

### Task 7: Durable WooCommerce Webhook Delivery

**Files:**
- Modify: `plugins/woocommerce/packagepro-fulfillment/packagepro-fulfillment.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-webhooks.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-admin.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-sync.php`
- Create: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-webhook-queue.php`
- Test: `plugins/woocommerce/packagepro-fulfillment/tests/webhooks-test.php`

**Step 1: Write the failing PHP test**
- Queueing a webhook event stores:
  - topic
  - order id
  - payload body
  - idempotency key
  - retry count / next attempt metadata
- Delivery success clears or marks the queued item processed.
- Delivery failure schedules retry metadata instead of treating the event as success.

**Step 2: Run the PHP test to verify RED**
- Run: `php plugins/woocommerce/packagepro-fulfillment/tests/webhooks-test.php`

**Step 3: Implement minimal code**
- Replace fire-and-forget sends with queued records plus a WP-Cron worker.
- Retry failed deliveries with capped backoff.
- Add idempotency headers/keys per event.
- Surface queue/last failure status in the admin UI.
- Keep hourly reconcile as a secondary backstop, not the primary retry path.

**Step 4: Re-run the PHP test**
- Confirm it passes.

### Task 8: Verification Pass

**Files:**
- Review: all modified files

**Step 1: Run package-level tests**
- Run: `pnpm --filter @packagepro/desktop test`
- Run: `pnpm --filter @packagepro/web test`
- Run: `php plugins/woocommerce/packagepro-fulfillment/tests/webhooks-test.php`

**Step 2: Run type checks/lint slices if available**
- Run: `pnpm --filter @packagepro/desktop type-check`
- Run: `pnpm --filter @packagepro/web type-check`

**Step 3: Read IDE diagnostics**
- Use `ReadLints` on changed desktop/web/plugin-adjacent files and fix newly introduced issues.

**Step 4: Final review**
- Confirm each originally requested item is either:
  - implemented, or
  - explicitly ruled out because current product direction chose a different path.
