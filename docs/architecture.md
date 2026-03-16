# PackagePro System Architecture

## System Overview

PackagePro is a **WooCommerce proof-of-packing video system** with ShipStation shipping integration. It enables merchants to record packing videos for orders, attach them to WooCommerce orders, and deliver secure video links to customers via email—all while managing shipping through ShipStation.

## Core Components

| Component | Stack | Purpose |
|-----------|-------|---------|
| **Cloud Backend / Admin Portal** | Next.js 15 + Supabase | Auth, org/store/station management, order sync, video metadata, ShipStation proxy |
| **Desktop Fulfillment App** | Electron + React | Packing station UI: order queue, video capture, label printing, upload |
| **WooCommerce Plugin** | PHP 8.1+ | Webhooks, order sync triggers, video attachment, customer email via WC Mailer |
| **Video Viewer** | Web (embedded or standalone) | Customer-facing secure video playback with token-based access |

## Key Architectural Principle

> **Desktop apps talk to the cloud backend only—never directly to WooCommerce or ShipStation.**  
> All secrets (API keys, webhook secrets) stay server-side. The desktop app authenticates via Supabase Auth and calls backend APIs that proxy to WooCommerce and ShipStation.

## Monorepo Structure

```
PackagePro/
├── apps/
│   ├── web/          # Next.js 15 admin portal
│   └── desktop/      # Electron + React fulfillment app
├── packages/
│   ├── shared/       # Shared types, constants, utilities
│   ├── db/           # Drizzle schema, migrations
│   ├── ui/           # Shared React components (shadcn/ui)
│   ├── shipstation/  # ShipStation API client
│   └── supabase-client/  # Supabase client config
└── plugins/
    └── woocommerce/  # PHP WooCommerce plugin
```

**Tooling:** pnpm workspaces + Turborepo for build orchestration.

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Admin Portal** | Next.js 15 App Router, Tailwind CSS, shadcn/ui |
| **Database & Auth** | Supabase (Postgres, Auth, Storage, Realtime) |
| **Desktop App** | Electron, React, Vite |
| **Plugin** | PHP 8.1+, WooCommerce REST API, WC Mailer |
| **Video Storage** | Supabase Storage (private bucket) |

## Multi-Tenant Model

```
organizations
    └── memberships (users + roles)
    └── stores (WooCommerce sites)
        └── shipstation_store_mappings
    └── stations (packing stations)
        └── shipstation_accounts (optional)
```

**Roles:**

| Role | Capabilities |
|------|--------------|
| `org_owner` | Full org control, billing |
| `org_admin` | Manage users, stores, stations |
| `warehouse_manager` | Manage stations, view analytics |
| `packer` | Access order queue, record videos, print labels |
| `support_viewer` | Read-only access for support |

## Data Flow

```
┌─────────────────┐     webhooks      ┌──────────────────┐
│   WooCommerce   │ ─────────────────► │  Cloud Backend    │
│   (Plugin)      │                    │  (Next.js)        │
└─────────────────┘                    └────────┬─────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │   Supabase    │           │  ShipStation  │           │   Supabase    │
            │   (Postgres,  │           │  (labels,     │           │   Storage     │
            │   Auth)       │           │   rates)      │           │   (videos)    │
            └───────────────┘           └───────────────┘           └───────────────┘
                    ▲                           ▲                           ▲
                    │                           │                           │
                    └───────────────────────────┼───────────────────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │   Desktop     │
                                        │   Fulfillment │
                                        │   App         │
                                        └───────────────┘
```

**End-to-end flow:**

1. **Order sync:** WooCommerce webhooks → backend syncs orders into `orders` table
2. **Queue fetch:** Desktop app fetches order queue for its station
3. **Packing:** Packer scans order, records video, prints ShipStation label
4. **Upload:** Video uploaded to Supabase Storage (private bucket)
5. **Attachment:** Backend attaches video metadata to Woo order via plugin callback
6. **Customer email:** Plugin sends email via WC Mailer with secure viewer link

## ShipStation Integration

- **V2 API:** Labels, rates, carriers—all proxied through backend
- **V1 API:** Store management (legacy)
- **Flow:** Backend holds encrypted ShipStation API keys; desktop requests labels via backend; backend calls ShipStation and returns label URL/data

## Video Security

| Layer | Mechanism |
|-------|------------|
| **Storage** | Private Supabase bucket, no public URLs |
| **Access** | Signed URLs (1hr expiry) generated server-side |
| **Tokens** | Opaque 32-byte random tokens, SHA-256 hashed in DB |
| **Optional** | Secondary verification (email + ZIP) for high-value orders |

---

*See also: [Data Model](./data-model.md), [Security](./security.md), [MVP Scope](./mvp-scope.md), [Implementation Plan](./implementation-plan.md)*
