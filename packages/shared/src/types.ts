import { z } from 'zod';

// === Enums ===
export const MembershipRole = z.enum(['org_owner', 'org_admin', 'warehouse_manager', 'packer', 'support_viewer']);
export type MembershipRole = z.infer<typeof MembershipRole>;

export const StationStatus = z.enum(['online', 'offline', 'busy']);
export type StationStatus = z.infer<typeof StationStatus>;

export const OrderVideoStatus = z.enum(['none', 'recording', 'uploading', 'ready', 'failed', 'deleted']);
export type OrderVideoStatus = z.infer<typeof OrderVideoStatus>;

export const VideoStatus = z.enum(['uploading', 'processing', 'ready', 'failed', 'deleted']);
export type VideoStatus = z.infer<typeof VideoStatus>;

export const UploadStatus = z.enum(['pending', 'uploading', 'completed', 'failed']);
export type UploadStatus = z.infer<typeof UploadStatus>;

export const SyncStatus = z.enum(['pending', 'syncing', 'synced', 'error']);
export type SyncStatus = z.infer<typeof SyncStatus>;

// === Core entities ===
// Organization
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  plan: z.string().default('free'),
  settings: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// User
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string().max(255).nullable(),
  avatar_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

// Membership
export const MembershipSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  org_id: z.string().uuid(),
  role: MembershipRole,
  created_at: z.string().datetime(),
});
export type Membership = z.infer<typeof MembershipSchema>;

// Store
export const StoreSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  url: z.string().url(),
  webhook_secret: z.string().nullable(),
  pairing_code: z.string().nullable(),
  paired_at: z.string().datetime().nullable(),
  sync_status: SyncStatus,
  last_sync_at: z.string().datetime().nullable(),
  settings: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Store = z.infer<typeof StoreSchema>;

// Station
export const StationSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  machine_id: z.string().nullable(),
  status: StationStatus,
  last_heartbeat: z.string().datetime().nullable(),
  settings: z.record(z.unknown()).default({}),
  created_at: z.string().datetime(),
});
export type Station = z.infer<typeof StationSchema>;

// ShipStation Account
export const ShipStationAccountSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  label: z.string().max(255),
  connection_status: z.string(),
  last_tested_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type ShipStationAccount = z.infer<typeof ShipStationAccountSchema>;

// ShipStation Store Mapping
export const ShipStationStoreMappingSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  shipstation_account_id: z.string().uuid(),
  shipstation_store_id: z.string(),
  shipstation_store_name: z.string(),
  created_at: z.string().datetime(),
});
export type ShipStationStoreMapping = z.infer<typeof ShipStationStoreMappingSchema>;

// Order
export const OrderSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  woo_order_id: z.number().int(),
  woo_order_number: z.string(),
  woo_order_key: z.string().nullable(),
  shipstation_order_id: z.string().nullable(),
  status: z.string(),
  customer_email: z.string().email().nullable(),
  customer_name: z.string().nullable(),
  shipping_address: z.record(z.unknown()).nullable(),
  line_items: z.array(z.record(z.unknown())).default([]),
  order_total: z.string().nullable(),
  video_status: OrderVideoStatus,
  synced_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Order = z.infer<typeof OrderSchema>;

// Order Lock
export const OrderLockSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  station_id: z.string().uuid(),
  user_id: z.string().uuid(),
  locked_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  released_at: z.string().datetime().nullable(),
});
export type OrderLock = z.infer<typeof OrderLockSchema>;

// Video
export const VideoSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  store_id: z.string().uuid(),
  order_id: z.string().uuid(),
  station_id: z.string().uuid(),
  user_id: z.string().uuid(),
  storage_provider: z.string().default('supabase'),
  storage_path: z.string(),
  file_size_bytes: z.number().nullable(),
  duration_seconds: z.number().nullable(),
  resolution: z.string().nullable(),
  status: VideoStatus,
  uploaded_at: z.string().datetime().nullable(),
  ready_at: z.string().datetime().nullable(),
  deleted_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Video = z.infer<typeof VideoSchema>;

// Video Access Token
export const VideoAccessTokenSchema = z.object({
  id: z.string().uuid(),
  video_id: z.string().uuid(),
  order_id: z.string().uuid(),
  token_hash: z.string(),
  expires_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable(),
  secondary_verification: z.boolean().default(false),
  created_at: z.string().datetime(),
});
export type VideoAccessToken = z.infer<typeof VideoAccessTokenSchema>;

// Store Settings
export const StoreSettingsSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  email_enabled: z.boolean().default(true),
  email_template: z.record(z.unknown()).default({}),
  retention_days: z.number().int().default(90),
  require_secondary_verification: z.boolean().default(false),
  auto_record_on_scan: z.boolean().default(false),
  feature_flags: z.record(z.boolean()).default({}),
  created_at: z.string().datetime(),
});
export type StoreSettings = z.infer<typeof StoreSettingsSchema>;
