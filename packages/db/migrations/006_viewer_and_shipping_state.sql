-- Viewer token policy and shipping label persistence

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS viewer_token_ttl_days integer DEFAULT 90
  CHECK (viewer_token_ttl_days >= 1 AND viewer_token_ttl_days <= 365);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number varchar(255),
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS shipment_status varchar(50);

CREATE TABLE IF NOT EXISTS shipping_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipstation_account_id uuid REFERENCES shipstation_accounts(id) ON DELETE SET NULL,
  external_label_id varchar(100) NOT NULL UNIQUE,
  tracking_number varchar(255),
  label_download_url text,
  carrier_id varchar(255),
  service_code varchar(255),
  shipment_cost numeric(10, 2),
  currency varchar(10) DEFAULT 'USD',
  status varchar(50) NOT NULL DEFAULT 'created',
  ship_to jsonb,
  ship_from jsonb,
  packages jsonb DEFAULT '[]',
  voided_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipping_labels_order_id ON shipping_labels(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_store_id ON shipping_labels(store_id);
CREATE INDEX IF NOT EXISTS idx_shipping_labels_org_id ON shipping_labels(org_id);
