# PackagePro Implementation Plan

Phased rollout from scaffolding to production-ready MVP.

---

## Phase 1: Architecture + Scaffolding

**Goal:** Monorepo, schema, and app skeletons in place.

| Task | Details |
|------|---------|
| Monorepo setup | pnpm workspaces, Turborepo, `apps/web`, `apps/desktop`, `packages/*`, `plugins/woocommerce` |
| Database schema | Drizzle schema for all tables; migrations; enums |
| App skeletons | Next.js 15 (App Router), Electron + React + Vite, minimal PHP plugin |
| Supabase project | Postgres, Auth, Storage bucket (private), RLS policies |
| Shared packages | `packages/shared` (types), `packages/db` (schema), `packages/ui` (shadcn) |

**Deliverables:** Repo builds, migrations run, apps launch (empty UI).

---

## Phase 2: Core Connectivity

**Goal:** Auth, org/store/station CRUD, pairing, order sync.

| Task | Details |
|------|---------|
| Supabase Auth | Sign up, sign in, session handling in web + desktop |
| Organizations | CRUD, slug, `memberships` with roles |
| Stores | CRUD, encrypted WooCommerce credentials, `webhook_secret` |
| Stations | CRUD, `pairing_code` generation, `paired_at` |
| Desktop pairing | Enter code → validate → persist station identity |
| Order sync | Plugin webhooks (order.updated) → backend syncs to `orders` |
| Order queue API | Desktop fetches orders for its station (pending, assigned) |
| Order locking | Lock/unlock with `order_locks`; enforce one active lock |

**Deliverables:** Admin can configure org/stores/stations; desktop pairs; orders sync and appear in queue.

---

## Phase 3: Video Capture MVP

**Goal:** Webcam recording, transcode, upload, packing-mode UI.

| Task | Details |
|------|---------|
| Webcam capture | MediaRecorder API, configurable resolution/framerate |
| Transcode | Client-side or ffmpeg; target format (e.g. WebM → MP4) |
| Upload API | Backend endpoint for presigned upload or chunked upload |
| Storage | Private bucket; path: `{org_id}/{order_id}/{video_id}.mp4` |
| Packing mode UI | Order detail view, record button, progress, success state |
| `videos` + `uploads` | Create records; update status on completion/failure |
| Temp file security | Encrypt temp file; delete after upload |

**Deliverables:** Packer can record and upload video; video appears in Storage and `videos` table.

---

## Phase 4: ShipStation Shipping

**Goal:** Labels, rates, printing from desktop via backend.

| Task | Details |
|------|---------|
| `packages/shipstation` | Client lib for V2 API (labels, rates, carriers) |
| Backend proxy | API routes that call ShipStation with decrypted credentials |
| Store mapping | `shipstation_store_mappings`; link Woo store to SS store |
| Create label | Desktop requests label → backend creates → returns label URL |
| Print label | Desktop fetches PDF and triggers print dialog |
| Rates (optional) | Fetch rates for order; display before creating label |

**Deliverables:** Packer can create and print ShipStation labels from desktop.

---

## Phase 5: Customer Email + Viewer

**Goal:** Tokens, viewer page, email integration.

| Task | Details |
|------|---------|
| Token generation | On video ready: create `video_access_tokens` (opaque, hashed) |
| Viewer page | `/v/[token]` — verify token, return signed URL, embed player |
| Plugin callback | Backend notifies plugin when video ready; plugin attaches to order |
| Email template | WC Mailer template with viewer link: `{site}/v/{token}` |
| Signed URLs | Backend generates 1hr signed URL for Supabase Storage |
| Rate limiting | 10 req/min per token on viewer verify endpoint |

**Deliverables:** Customer receives email; can watch video via secure link.

---

## Phase 6: Hardening

**Goal:** Retries, reconciliation, audit, retention, tests.

| Task | Details |
|------|---------|
| Webhook retries | Plugin retries failed deliveries; idempotency |
| Order reconciliation | Periodic job to align WooCommerce and `orders` table |
| Audit logging | `audit_logs` for video views, locks, uploads, credential changes |
| Retention | Background job to delete videos past `video_retention_days` |
| Error handling | Graceful failures, user-facing messages |
| Tests | Unit tests for critical paths; E2E for core flow |

**Deliverables:** Resilient sync, audit trail, retention, test coverage.

---

## Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
   │           │           │           │           │
   │           │           │           └───────────┴── (Phase 4 & 5 can overlap slightly)
   │           │           │
   │           │           └── Video capture blocks Phase 5 (token generation)
   │           │
   │           └── Order sync blocks Phase 3 (queue), Phase 4 (labels)
   │
   └── Schema must be complete before Phase 2
```

---

## Suggested Timeline (Rough)

| Phase | Duration | Notes |
|-------|----------|-------|
| 1 | 1–2 weeks | Foundation |
| 2 | 2–3 weeks | Most integration work |
| 3 | 1–2 weeks | Video pipeline |
| 4 | 1–2 weeks | ShipStation proxy |
| 5 | 1 week | Viewer + email |
| 6 | 1–2 weeks | Polish and tests |

---

*See also: [Architecture](./architecture.md), [MVP Scope](./mvp-scope.md)*
