# PackagePro Data Model

## Overview

All tenant-scoped tables include `org_id` and are protected by Row Level Security (RLS) using `auth.uid()` and `memberships`.

## Tables

### organizations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | NOT NULL |
| slug | text | UNIQUE, NOT NULL |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### users

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | |
| full_name | text | |
| avatar_url | text | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### memberships

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| user_id | uuid | FK → users, NOT NULL |
| role | membership_role | NOT NULL |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Unique:** (org_id, user_id)

### stores

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| name | text | NOT NULL |
| site_url | text | NOT NULL |
| woo_consumer_key | text | Encrypted |
| woo_consumer_secret | text | Encrypted |
| webhook_secret | text | For HMAC verification |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### stations

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| store_id | uuid | FK → stores, NOT NULL |
| name | text | NOT NULL |
| status | station_status | default 'active' |
| pairing_code | text | Short-lived for desktop pairing |
| paired_at | timestamptz | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### shipstation_accounts

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| api_key | text | Encrypted |
| api_secret | text | Encrypted |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### shipstation_store_mappings

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| store_id | uuid | FK → stores, NOT NULL |
| shipstation_account_id | uuid | FK → shipstation_accounts, NOT NULL |
| shipstation_store_id | text | SS store ID |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

**Unique:** (store_id) — one ShipStation store per WooCommerce store

### orders

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| store_id | uuid | FK → stores, NOT NULL |
| station_id | uuid | FK → stations, nullable (assigned when locked) |
| woo_order_id | text | NOT NULL |
| woo_order_number | text | Display number |
| status | text | e.g. processing, completed |
| video_status | order_video_status | default 'pending' |
| customer_email | text | |
| shipping_address | jsonb | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| synced_at | timestamptz | Last webhook sync |

**Unique:** (store_id, woo_order_id)

### order_locks

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| order_id | uuid | FK → orders, NOT NULL |
| station_id | uuid | FK → stations, NOT NULL |
| locked_by | uuid | FK → users |
| locked_at | timestamptz | default now() |
| expires_at | timestamptz | |

**Constraint:** One active lock per order (enforced by unique partial index or application logic)

### videos

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations, NOT NULL |
| order_id | uuid | FK → orders, NOT NULL |
| station_id | uuid | FK → stations, NOT NULL |
| storage_path | text | Path in Supabase Storage |
| status | video_status | default 'uploading' |
| duration_seconds | integer | |
| file_size_bytes | bigint | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### video_access_tokens

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| video_id | uuid | FK → videos, NOT NULL |
| token_hash | text | SHA-256 of opaque token, UNIQUE |
| expires_at | timestamptz | |
| secondary_verified_at | timestamptz | Optional email/ZIP check |
| created_at | timestamptz | default now() |

### video_access_logs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| token_id | uuid | FK → video_access_tokens |
| ip_hash | text | Hashed for privacy |
| user_agent | text | Truncated |
| accessed_at | timestamptz | default now() |

### uploads

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| video_id | uuid | FK → videos |
| status | upload_status | |
| bytes_uploaded | bigint | |
| error_message | text | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### email_events

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations |
| order_id | uuid | FK → orders |
| event_type | text | e.g. video_email_sent |
| recipient_hash | text | Hashed email |
| created_at | timestamptz | default now() |

### webhook_deliveries

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| store_id | uuid | FK → stores |
| topic | text | e.g. order.updated |
| payload_id | text | Order ID from payload |
| status | text | success, failed |
| response_code | integer | |
| error_message | text | |
| created_at | timestamptz | default now() |

### audit_logs

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations |
| actor_id | uuid | FK → users |
| action | text | e.g. video.viewed, order.locked |
| resource_type | text | order, video, etc. |
| resource_id | uuid | |
| metadata | jsonb | |
| created_at | timestamptz | default now() |

### store_settings

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| store_id | uuid | FK → stores, UNIQUE |
| require_secondary_verification | boolean | default false |
| video_retention_days | integer | |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

---

## Enums

```sql
CREATE TYPE membership_role AS ENUM (
  'org_owner', 'org_admin', 'warehouse_manager', 'packer', 'support_viewer'
);

CREATE TYPE station_status AS ENUM ('active', 'inactive', 'maintenance');

CREATE TYPE order_video_status AS ENUM ('pending', 'recording', 'uploading', 'ready', 'failed');

CREATE TYPE video_status AS ENUM ('uploading', 'processing', 'ready', 'failed');

CREATE TYPE upload_status AS ENUM ('pending', 'uploading', 'completed', 'failed');
```

---

## Relationships (Foreign Keys)

```
organizations
  ├── memberships.org_id
  ├── stores.org_id
  ├── stations.org_id (via store)
  ├── shipstation_accounts.org_id
  ├── orders.org_id
  ├── videos.org_id
  ├── email_events.org_id
  └── audit_logs.org_id

stores
  ├── stations.store_id
  ├── orders.store_id
  ├── shipstation_store_mappings.store_id
  ├── webhook_deliveries.store_id
  └── store_settings.store_id

orders
  ├── order_locks.order_id
  ├── videos.order_id
  ├── email_events.order_id
  └── audit_logs.resource_id (when resource_type='order')

videos
  ├── video_access_tokens.video_id
  ├── uploads.video_id
  └── audit_logs.resource_id (when resource_type='video')
```

---

## Key Constraints

| Constraint | Description |
|------------|-------------|
| One active lock per order | `order_locks` allows only one non-expired lock per `order_id` |
| Org scoping | All tenant tables have `org_id`; RLS enforces via `memberships` |
| Token uniqueness | `video_access_tokens.token_hash` is UNIQUE |
| Store–ShipStation | One ShipStation store mapping per WooCommerce store |

---

## RLS Strategy

All tenant tables use the same pattern:

```sql
-- Example for orders
CREATE POLICY "org_members_select_orders"
  ON orders FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_insert_orders"
  ON orders FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );
-- Similar for UPDATE, DELETE as needed
```

**Principle:** `auth.uid()` → `memberships` → `org_id` → filter all tenant rows.

---

*See also: [Architecture](./architecture.md), [Security](./security.md)*
