-- PackagePro Initial Schema Migration
-- Run this migration against your Supabase database

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE membership_role AS ENUM ('org_owner', 'org_admin', 'warehouse_manager', 'packer', 'support_viewer');
CREATE TYPE station_status AS ENUM ('online', 'offline', 'busy');
CREATE TYPE order_video_status AS ENUM ('none', 'recording', 'uploading', 'ready', 'failed', 'deleted');
CREATE TYPE video_status AS ENUM ('uploading', 'processing', 'ready', 'failed', 'deleted');
CREATE TYPE upload_status AS ENUM ('pending', 'uploading', 'completed', 'failed');
CREATE TYPE sync_status AS ENUM ('pending', 'syncing', 'synced', 'error');

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  slug varchar(100) UNIQUE NOT NULL,
  plan varchar(50) DEFAULT 'free',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  full_name varchar(255),
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id)
);

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  url text NOT NULL,
  consumer_key_encrypted text,
  consumer_secret_encrypted text,
  webhook_secret text,
  pairing_code varchar(64),
  paired_at timestamptz,
  sync_status sync_status DEFAULT 'pending',
  last_sync_at timestamptz,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  machine_id text,
  status station_status DEFAULT 'offline',
  last_heartbeat timestamptz,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shipstation_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label varchar(255) NOT NULL,
  api_key_encrypted text NOT NULL,
  connection_status varchar(50) DEFAULT 'untested',
  last_tested_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE shipstation_store_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shipstation_account_id uuid NOT NULL REFERENCES shipstation_accounts(id) ON DELETE CASCADE,
  shipstation_store_id varchar(100) NOT NULL,
  shipstation_store_name varchar(255),
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, shipstation_store_id)
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  woo_order_id integer NOT NULL,
  woo_order_number varchar(100) NOT NULL,
  woo_order_key varchar(255),
  shipstation_order_id varchar(100),
  status varchar(50) NOT NULL,
  customer_email varchar(255),
  customer_name varchar(255),
  shipping_address jsonb,
  line_items jsonb DEFAULT '[]',
  order_total varchar(50),
  video_status order_video_status DEFAULT 'none',
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, woo_order_id)
);

CREATE TABLE order_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz
);

CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_provider varchar(50) DEFAULT 'supabase',
  storage_path text NOT NULL,
  file_size_bytes bigint,
  duration_seconds numeric(10, 2),
  resolution varchar(50),
  status video_status DEFAULT 'uploading',
  uploaded_at timestamptz,
  ready_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE video_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token_hash varchar(128) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  secondary_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE video_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  token_id uuid REFERENCES video_access_tokens(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  accessed_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  status upload_status DEFAULT 'pending',
  attempt_count integer DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type varchar(100) NOT NULL,
  recipient varchar(255) NOT NULL,
  status varchar(50) NOT NULL,
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  source varchar(50) NOT NULL,
  topic varchar(100) NOT NULL,
  payload jsonb NOT NULL,
  status varchar(50) DEFAULT 'received',
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id uuid,
  actor_type varchar(50),
  action varchar(100) NOT NULL,
  resource_type varchar(100),
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid UNIQUE NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  email_template jsonb DEFAULT '{}',
  retention_days integer DEFAULT 90,
  require_secondary_verification boolean DEFAULT false,
  auto_record_on_scan boolean DEFAULT false,
  feature_flags jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- orders
CREATE INDEX idx_orders_store_woo_order_number ON orders(store_id, woo_order_number);
CREATE INDEX idx_orders_org_video_status ON orders(org_id, video_status);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_org_id ON orders(org_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);

-- videos
CREATE INDEX idx_videos_order_id ON videos(order_id);
CREATE INDEX idx_videos_org_status ON videos(org_id, status);
CREATE INDEX idx_videos_org_id ON videos(org_id);
CREATE INDEX idx_videos_store_id ON videos(store_id);

-- video_access_tokens
CREATE INDEX idx_video_access_tokens_token_hash ON video_access_tokens(token_hash);
CREATE INDEX idx_video_access_tokens_video_id ON video_access_tokens(video_id);
CREATE INDEX idx_video_access_tokens_order_id ON video_access_tokens(order_id);

-- order_locks (partial unique index for active locks)
CREATE UNIQUE INDEX idx_order_locks_active ON order_locks(order_id) WHERE released_at IS NULL;
CREATE INDEX idx_order_locks_order_id ON order_locks(order_id);
CREATE INDEX idx_order_locks_station_id ON order_locks(station_id);
CREATE INDEX idx_order_locks_user_id ON order_locks(user_id);

-- audit_logs
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);

-- webhook_deliveries
CREATE INDEX idx_webhook_deliveries_store_created ON webhook_deliveries(store_id, created_at);
CREATE INDEX idx_webhook_deliveries_store_id ON webhook_deliveries(store_id);

-- email_events
CREATE INDEX idx_email_events_order_id ON email_events(order_id);
CREATE INDEX idx_email_events_store_id ON email_events(store_id);

-- stations
CREATE INDEX idx_stations_org_store ON stations(org_id, store_id);
CREATE INDEX idx_stations_org_id ON stations(org_id);
CREATE INDEX idx_stations_store_id ON stations(store_id);

-- memberships
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_org_id ON memberships(org_id);

-- stores
CREATE INDEX idx_stores_org_id ON stores(org_id);

-- shipstation_accounts
CREATE INDEX idx_shipstation_accounts_org_id ON shipstation_accounts(org_id);

-- shipstation_store_mappings
CREATE INDEX idx_shipstation_store_mappings_org_id ON shipstation_store_mappings(org_id);
CREATE INDEX idx_shipstation_store_mappings_store_id ON shipstation_store_mappings(store_id);
CREATE INDEX idx_shipstation_store_mappings_shipstation_account_id ON shipstation_store_mappings(shipstation_account_id);

-- uploads
CREATE INDEX idx_uploads_video_id ON uploads(video_id);
CREATE INDEX idx_uploads_station_id ON uploads(station_id);

-- video_access_logs
CREATE INDEX idx_video_access_logs_video_id ON video_access_logs(video_id);
CREATE INDEX idx_video_access_logs_token_id ON video_access_logs(token_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipstation_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipstation_store_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- organizations: SELECT if user has membership
CREATE POLICY "org_member_select" ON organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- users: users can read their own row
CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- memberships: full CRUD scoped by org membership
CREATE POLICY "memberships_select" ON memberships
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships m WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships m WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships m WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships m WHERE m.user_id = auth.uid()
    )
  );

-- stores: full CRUD scoped by org membership
CREATE POLICY "stores_select" ON stores
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stores_insert" ON stores
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stores_update" ON stores
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stores_delete" ON stores
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- stations: full CRUD scoped by org membership
CREATE POLICY "stations_select" ON stations
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stations_insert" ON stations
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stations_update" ON stations
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "stations_delete" ON stations
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- shipstation_accounts: full CRUD scoped by org membership
CREATE POLICY "shipstation_accounts_select" ON shipstation_accounts
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_accounts_insert" ON shipstation_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_accounts_update" ON shipstation_accounts
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_accounts_delete" ON shipstation_accounts
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- shipstation_store_mappings: full CRUD scoped by org membership
CREATE POLICY "shipstation_store_mappings_select" ON shipstation_store_mappings
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_store_mappings_insert" ON shipstation_store_mappings
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_store_mappings_update" ON shipstation_store_mappings
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "shipstation_store_mappings_delete" ON shipstation_store_mappings
  FOR DELETE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- orders: SELECT/INSERT/UPDATE scoped by org membership
CREATE POLICY "orders_select" ON orders
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- order_locks: full CRUD scoped by org membership (via order)
CREATE POLICY "order_locks_select" ON order_locks
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_locks_insert" ON order_locks
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_locks_update" ON order_locks
  FOR UPDATE TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "order_locks_delete" ON order_locks
  FOR DELETE TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- videos: full CRUD scoped by org membership
CREATE POLICY "videos_select" ON videos
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "videos_insert" ON videos
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "videos_update" ON videos
  FOR UPDATE TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- video_access_tokens: admin SELECT via org membership (via video)
CREATE POLICY "video_access_tokens_select" ON video_access_tokens
  FOR SELECT TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- video_access_logs: admin SELECT via org membership (via video)
CREATE POLICY "video_access_logs_select" ON video_access_logs
  FOR SELECT TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- uploads: full CRUD scoped via video -> org membership
CREATE POLICY "uploads_select" ON uploads
  FOR SELECT TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "uploads_insert" ON uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "uploads_update" ON uploads
  FOR UPDATE TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "uploads_delete" ON uploads
  FOR DELETE TO authenticated
  USING (
    video_id IN (
      SELECT id FROM videos WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- store_settings: full CRUD scoped via store -> org membership
CREATE POLICY "store_settings_select" ON store_settings
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "store_settings_insert" ON store_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "store_settings_update" ON store_settings
  FOR UPDATE TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "store_settings_delete" ON store_settings
  FOR DELETE TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- audit_logs: SELECT only, scoped by org membership
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- email_events: SELECT only, scoped via store -> org membership
CREATE POLICY "email_events_select" ON email_events
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- webhook_deliveries: SELECT only, scoped via store -> org membership
CREATE POLICY "webhook_deliveries_select" ON webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE org_id IN (
        SELECT org_id FROM memberships WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- USER TRIGGER (auto-create users row on auth signup)
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- STORAGE BUCKET
-- =============================================================================
-- Run via Supabase Storage API or dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false);
