# Audit Remediation Batch 3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining verified audit gaps in Electron runtime behavior, desktop recovery/setup ergonomics, and WooCommerce reconciliation/key lifecycle without reworking areas that were already fixed in prior passes.

**Architecture:** Keep changes narrowly scoped to the still-open failure modes. For Electron, prefer helper extraction and queue serialization so the main process stops doing unsafe whole-file buffering and racy config writes. For desktop flows, layer recovery/reconnect UX on top of the already-correct API-backed setup path. For WooCommerce, extend the current queue/retry hardening instead of introducing an entirely separate subsystem.

**Tech Stack:** TypeScript, Electron, Node.js streams/crypto, React, Next.js route handlers, WooCommerce PHP, Action Scheduler/WP Cron compatibility, Vitest

---

### Task 1: Electron Runtime Hardening

**Files:**
- Modify: `apps/desktop/electron/main.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Modify: `apps/desktop/src/electron.d.ts`
- Create: `apps/desktop/electron/print-label.ts`
- Create: `apps/desktop/electron/config-store.ts`
- Create: `apps/desktop/electron/path-utils.ts`
- Test: `apps/desktop/src/lib/__tests__/electron-path-utils.test.ts`
- Test: `apps/desktop/src/lib/__tests__/config-store.test.ts`

**Step 1: Write the failing tests**
- Add tests for:
  - `resolveWithin` using `path.relative()`-style escape detection instead of raw `startsWith`
  - serialized config updates preserving all keys across rapid writes

**Step 2: Run tests to verify RED**
- Run the focused desktop tests for the new helpers

**Step 3: Write minimal implementation**
- Replace case-sensitive string-prefix path validation with relative-path based checking
- Introduce a serialized/atomic config write queue or `setMany` path
- Change PDF printing away from hidden-window `webContents.print()` for PDF URLs
- Reduce finalize memory pressure by removing the all-chunks `Buffer.concat(buffers)` pattern

**Step 4: Run tests to verify GREEN**
- Re-run the focused helper tests

### Task 2: Desktop Recovery And Reconnect UX

**Files:**
- Modify: `apps/desktop/src/screens/PackingScreen.tsx`
- Modify: `apps/desktop/src/screens/SetupWizardScreen.tsx`
- Modify: `apps/desktop/src/screens/DashboardScreen.tsx`
- Modify: `apps/desktop/src/lib/api.ts`
- Create: `apps/desktop/src/lib/station-registration.ts`
- Test: `apps/desktop/src/lib/__tests__/station-registration.test.ts`

**Step 1: Write the failing tests**
- Add tests for:
  - selecting/reusing an existing station before creating a new one
  - preserving a stable `machine_id` for idempotent station registration helpers

**Step 2: Run tests to verify RED**
- Run the focused desktop tests

**Step 3: Write minimal implementation**
- Add a manual retry action for the current failed upload directly in `PackingScreen`
- Stop re-registering heartbeat intervals when dashboard order filters change
- Load existing stations in setup, allow reconnect/reuse, and only create a new station when explicitly requested

**Step 4: Run tests to verify GREEN**
- Re-run the focused desktop tests

### Task 3: Woo Reconciliation And API Key Lifecycle

**Files:**
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-sync.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-api.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/packagepro-fulfillment.php`
- Modify: `plugins/woocommerce/packagepro-fulfillment/includes/class-packagepro-webhook-queue.php`

**Step 1: Add the smallest verifiable test seams possible**
- If PHP CLI is still unavailable, add or reuse pure helper functions for:
  - reconcile batch pagination arguments
  - old PackagePro API key cleanup lookup/deletion inputs

**Step 2: Run whatever focused verification is executable**
- Prefer JS/TS helper tests if PHP cannot run locally

**Step 3: Write minimal implementation**
- Reconcile active Woo orders in paged batches instead of a single hard-capped 50-order snapshot
- Queue or schedule reconcile batch dispatch instead of doing one inline blocking post per full backlog
- Delete or rotate the prior PackagePro-created Woo API key before inserting a replacement on re-pair

**Step 4: Re-run executable verification**
- Run any available tests and note PHP runtime limitations explicitly

### Task 4: Verification Pass

**Files:**
- Review: all modified files

**Step 1: Run package-level tests**
- Run: `pnpm --filter @packagepro/desktop test`
- Run: `pnpm --filter @packagepro/web test`

**Step 2: Run type checks**
- Run: `pnpm --filter @packagepro/desktop type-check`
- Run: `pnpm --filter @packagepro/web type-check`

**Step 3: Read IDE diagnostics**
- Use `ReadLints` on changed files and fix any new issues

**Step 4: Record verification limits**
- If PHP CLI remains unavailable, explicitly call out that WordPress runtime execution was not possible locally
