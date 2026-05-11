export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: string;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: string;
          settings?: Json;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          org_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          org_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          org_id?: string;
          role?: string;
          created_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          url: string;
          consumer_key_encrypted: string | null;
          consumer_secret_encrypted: string | null;
          webhook_secret: string | null;
          pairing_code: string | null;
          paired_at: string | null;
          sync_status: string;
          last_sync_at: string | null;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          url: string;
          consumer_key_encrypted?: string | null;
          consumer_secret_encrypted?: string | null;
          webhook_secret?: string | null;
          pairing_code?: string | null;
          paired_at?: string | null;
          sync_status?: string;
          last_sync_at?: string | null;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          url?: string;
          consumer_key_encrypted?: string | null;
          consumer_secret_encrypted?: string | null;
          webhook_secret?: string | null;
          pairing_code?: string | null;
          paired_at?: string | null;
          sync_status?: string;
          last_sync_at?: string | null;
          settings?: Json;
          created_at?: string;
        };
      };
      stations: {
        Row: {
          id: string;
          org_id: string;
          store_id: string;
          name: string;
          machine_id: string | null;
          status: string;
          last_heartbeat: string | null;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          store_id: string;
          name: string;
          machine_id?: string | null;
          status?: string;
          last_heartbeat?: string | null;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          store_id?: string;
          name?: string;
          machine_id?: string | null;
          status?: string;
          last_heartbeat?: string | null;
          settings?: Json;
          created_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          org_id: string;
          store_id: string;
          woo_order_id: number;
          woo_order_number: string;
          woo_order_key: string | null;
          shipstation_order_id: string | null;
          status: string;
          customer_email: string | null;
          customer_name: string | null;
          shipping_address: Json | null;
          line_items: Json;
          order_total: string | null;
          video_status: string;
          synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          store_id: string;
          woo_order_id: number;
          woo_order_number: string;
          woo_order_key?: string | null;
          shipstation_order_id?: string | null;
          status: string;
          customer_email?: string | null;
          customer_name?: string | null;
          shipping_address?: Json | null;
          line_items?: Json;
          order_total?: string | null;
          video_status?: string;
          synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          store_id?: string;
          woo_order_id?: number;
          woo_order_number?: string;
          woo_order_key?: string | null;
          shipstation_order_id?: string | null;
          status?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          shipping_address?: Json | null;
          line_items?: Json;
          order_total?: string | null;
          video_status?: string;
          synced_at?: string | null;
          created_at?: string;
        };
      };
      videos: {
        Row: {
          id: string;
          org_id: string;
          store_id: string;
          order_id: string;
          station_id: string;
          user_id: string;
          storage_provider: string;
          storage_path: string;
          file_size_bytes: number | null;
          duration_seconds: number | null;
          resolution: string | null;
          status: string;
          uploaded_at: string | null;
          ready_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          store_id: string;
          order_id: string;
          station_id: string;
          user_id: string;
          storage_provider?: string;
          storage_path: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          resolution?: string | null;
          status?: string;
          uploaded_at?: string | null;
          ready_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          store_id?: string;
          order_id?: string;
          station_id?: string;
          user_id?: string;
          storage_provider?: string;
          storage_path?: string;
          file_size_bytes?: number | null;
          duration_seconds?: number | null;
          resolution?: string | null;
          status?: string;
          uploaded_at?: string | null;
          ready_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
      };
      video_access_tokens: {
        Row: {
          id: string;
          video_id: string;
          order_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at: string | null;
          secondary_verification: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          order_id: string;
          token_hash: string;
          expires_at: string;
          revoked_at?: string | null;
          secondary_verification?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          video_id?: string;
          order_id?: string;
          token_hash?: string;
          expires_at?: string;
          revoked_at?: string | null;
          secondary_verification?: boolean;
          created_at?: string;
        };
      };
      // Additional tables have same pattern
      [key: string]: unknown;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      membership_role:
        | 'org_owner'
        | 'org_admin'
        | 'warehouse_manager'
        | 'packer'
        | 'support_viewer';
      station_status: 'online' | 'offline' | 'busy';
      order_video_status: 'none' | 'recording' | 'uploading' | 'ready' | 'failed' | 'deleted';
      video_status: 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
      upload_status: 'pending' | 'uploading' | 'completed' | 'failed';
      sync_status: 'pending' | 'syncing' | 'synced' | 'error';
    };
  };
}
