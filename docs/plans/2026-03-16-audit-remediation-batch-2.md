# Audit Remediation Batch 2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining high-priority audit findings that are still live after the prior remediation pass, across desktop recording/upload flow, web sync/finalize/order status handling, desktop onboarding, orders dashboard UX, and WooCommerce pairing security.

**Architecture:** Reuse the existing API/auth patterns where they are already correct, and extract small pure helpers where needed so risky behavior can be covered with focused tests instead of broad UI harnesses. Preserve the earlier WebM-based recording pipeline, but finish the desktop camera/device and upload scheduler hardening around it. For web and WooCommerce, prefer bounded side effects, bulk operations, and route-backed state transitions rather than direct client DB writes.

**Tech Stack:** TypeScript, React, Electron, Next.js route handlers, Supabase, Zod, Vitest, WordPress PHP

---

### Task 1: Finish Desktop Camera Compatibility And Retry Scheduling

**Files:**
- Modify: `apps/desktop/src/lib/camera-utils.ts`
- Modify: `apps/desktop/src/hooks/useCamera.ts`
- Modify: `apps/desktop/src/lib/upload-queue.ts`
- Test: `apps/desktop/src/lib/__tests__/camera-utils.test.ts`
- Test: `apps/desktop/src/lib/__tests__/upload-queue.test.ts`

**Step 1: Write the failing tests**
- Add/extend tests for:
  - preferred camera selection using `deviceId: { ideal }`
  - re-enumeration support after preview starts
  - upload queue allowing a newly enqueued job to run while another failed job is waiting for retry

**Step 2: Run tests to verify RED**
- Run: `pnpm --filter @packagepro/desktop test src/lib/__tests__/camera-utils.test.ts src/lib/__tests__/upload-queue.test.ts`

**Step 3: Write minimal implementation**
- Change preferred camera selection from `exact` to `ideal`
- Re-enumerate camera devices after preview success and surface no-camera errors cleanly
- Replace blocking retry sleeps with `nextRetryAt` scheduling so the processor can release immediately

**Step 4: Run tests to verify GREEN**
- Re-run the same focused desktop tests

### Task 2: Batch Store Sync And Time-Bound Finalize Side Effects

**Files:**
- Modify: `apps/web/src/app/api/stores/[id]/sync/route.ts`
- Modify: `apps/web/src/app/api/videos/[id]/finalize/route.ts`
- Create: `apps/web/src/lib/videos/fetch-with-timeout.ts`
- Test: `apps/web/src/lib/__tests__/reconcile-orders.test.ts`
- Create: `apps/web/src/lib/__tests__/fetch-with-timeout.test.ts`

**Step 1: Write the failing tests**
- Add/extend tests for:
  - bulk/chunked upsert behavior in store sync
  - outbound finalize side effects aborting after a bounded timeout

**Step 2: Run tests to verify RED**
- Run: `pnpm --filter @packagepro/web test src/lib/__tests__/reconcile-orders.test.ts src/lib/__tests__/fetch-with-timeout.test.ts`

**Step 3: Write minimal implementation**
- Convert sequential store sync upserts into chunked bulk upserts
- Wrap Woo attach/email fetches with an abortable timeout helper
- Run attach/email in parallel or `allSettled` so they do not serialize latency

**Step 4: Run tests to verify GREEN**
- Re-run the focused web tests

### Task 3: Correct Order Status Timing And Desktop Setup API Usage

**Files:**
- Modify: `apps/web/src/app/api/orders/[id]/lock/route.ts`
- Modify: `apps/web/src/app/api/organizations/route.ts`
- Modify: `apps/desktop/src/lib/api.ts`
- Modify: `apps/desktop/src/screens/SetupWizardScreen.tsx`
- Create: `apps/web/src/lib/__tests__/order-lock-status.test.ts`

**Step 1: Write the failing tests**
- Add tests for:
  - lock route no longer setting `video_status = 'recording'`
  - desktop setup using bearer-safe API routes for organization/station creation

**Step 2: Run tests to verify RED**
- Run the focused web test file(s)

**Step 3: Write minimal implementation**
- Remove the eager `video_status` update from the lock route
- Make `POST /api/organizations` use a server-authorized write path compatible with desktop bearer auth
- Add organization/station helpers to desktop `api.ts`
- Switch desktop setup writes from direct Supabase table mutations to `/api/organizations`, `/api/stations`, `/api/stores`, `/api/stores/:id/pair`

**Step 4: Run tests to verify GREEN**
- Re-run the focused tests plus any impacted desktop/web tests

### Task 4: Persist Warehouse Address And Improve Orders Dashboard Paging

**Files:**
- Modify: `apps/desktop/src/components/ShippingPanel.tsx`
- Modify: `apps/web/src/app/(dashboard)/orders/page.tsx`
- Create: `apps/web/src/lib/orders/orders-page-query.ts`
- Create: `apps/web/src/lib/__tests__/orders-page-query.test.ts`

**Step 1: Write the failing tests**
- Add tests for:
  - warehouse config keys loading/persisting consistently
  - orders page query parsing with page/per_page/search/status/video_status defaults and bounds

**Step 2: Run tests to verify RED**
- Run the focused desktop/web tests

**Step 3: Write minimal implementation**
- Hydrate and persist ship-from fields through Electron config
- Add page/search/filter query support to the orders dashboard and remove the hard 100-row truncation
- Replace `any[]` with a narrow typed order row shape
- Prefer server-side query params and pagination controls over a full client rewrite if that covers the audit gap with less risk

**Step 4: Run tests to verify GREEN**
- Re-run the focused tests

### Task 5: Harden Pairing Code Storage And Expiry UX

**Files:**
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-admin.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-api.php`
- Modify: `apps/web/src/app/api/stores/route.ts`
- Modify: `apps/web/src/app/api/stores/[id]/pair/route.ts`
- Modify: `apps/web/src/app/(dashboard)/stores/page.tsx`
- Create: `packages/shared/src/crypto-pairing.ts` or plugin-local helpers if simpler

**Step 1: Write the failing tests where possible**
- If PHP CLI remains unavailable, add the smallest possible pure JS/TS helper tests for any shared hashing/expiry logic, and document that runtime PHP verification is blocked by environment.

**Step 2: Run tests to verify RED**
- Run any new JS/TS tests; note PHP runtime limitation if still missing

**Step 3: Write minimal implementation**
- Stop storing/displaying plaintext pairing codes where they are not needed
- Store Woo pairing code as a hash plus creation/expiry metadata and compare with `hash_equals`
- Add expiry/countdown or expired-state messaging to the Woo admin page
- Harden pairing rate-limit keying beyond spoofable raw forwarded IP handling

**Step 4: Re-run what is executable**
- Run JS/TS tests and any PHP checks available in the environment

### Task 6: Verification Pass

**Files:**
- Review: all modified files

**Step 1: Run package-level tests**
- Run: `pnpm --filter @packagepro/desktop test`
- Run: `pnpm --filter @packagepro/web test`

**Step 2: Run type checks**
- Run: `pnpm --filter @packagepro/desktop type-check`
- Run: `pnpm --filter @packagepro/web type-check`

**Step 3: Read IDE diagnostics**
- Use `ReadLints` on changed files and fix any newly introduced issues

**Step 4: Note environment-limited verification**
- If PHP CLI is still unavailable, explicitly record that plugin runtime verification could not be executed locally
