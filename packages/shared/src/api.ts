import { z } from 'zod';
import { OrderVideoStatus } from './types';

// Store pairing
export const PairStoreRequestSchema = z.object({
  pairing_code: z.string().min(6).max(64),
  store_url: z.string().url(),
});

export const PairStoreResponseSchema = z.object({
  store_id: z.string().uuid(),
  store_name: z.string(),
  paired: z.boolean(),
});

// Station registration
export const RegisterStationRequestSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  machine_id: z.string(),
});

// Order lock
export const LockOrderRequestSchema = z.object({
  station_id: z.string().uuid(),
  duration_minutes: z.number().int().min(5).max(120).default(30),
});

export const LockOrderResponseSchema = z.object({
  lock_id: z.string().uuid(),
  order_id: z.string().uuid(),
  station_id: z.string().uuid(),
  expires_at: z.string().datetime(),
});

// Video upload
export const RequestUploadUrlSchema = z.object({
  order_id: z.string().uuid(),
  station_id: z.string().uuid(),
  file_name: z.string(),
  content_type: z.string().default('video/mp4'),
  file_size_bytes: z.number().int().optional(),
});

export const UploadUrlResponseSchema = z.object({
  video_id: z.string().uuid(),
  upload_url: z.string().url(),
  storage_path: z.string(),
});

export const FinalizeVideoRequestSchema = z.object({
  file_size_bytes: z.number().int().optional(),
  duration_seconds: z.number().optional(),
  resolution: z.string().optional(),
});

// ShipStation label
export const CreateLabelRequestSchema = z.object({
  order_id: z.string().uuid(),
  carrier_id: z.string(),
  service_code: z.string(),
  ship_from: z.object({
    name: z.string(),
    phone: z.string().optional(),
    address_line1: z.string(),
    address_line2: z.string().optional(),
    city_locality: z.string(),
    state_province: z.string(),
    postal_code: z.string(),
    country_code: z.string().default('US'),
  }),
  packages: z
    .array(
      z.object({
        weight: z.object({
          value: z.number(),
          unit: z.enum(['ounce', 'pound', 'gram', 'kilogram']).default('ounce'),
        }),
        dimensions: z
          .object({
            height: z.number(),
            width: z.number(),
            length: z.number(),
            unit: z.enum(['inch', 'centimeter']).default('inch'),
          })
          .optional(),
      })
    )
    .min(1),
});

export const LabelResponseSchema = z.object({
  label_id: z.string(),
  tracking_number: z.string(),
  label_download_url: z.string().url(),
  shipment_cost: z.number(),
  status: z.string(),
});

// Viewer
export const ViewerVerifyRequestSchema = z.object({
  email: z.string().email().optional(),
  postal_code: z.string().optional(),
});

export const ViewerResponseSchema = z.object({
  playback_url: z.string().url(),
  order_number: z.string(),
  store_name: z.string(),
  recorded_at: z.string().datetime(),
  requires_verification: z.boolean(),
});

// Orders list
export const OrdersListQuerySchema = z.object({
  store_id: z.string().uuid().optional(),
  status: z.string().optional(),
  video_status: OrderVideoStatus.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

// Webhooks
export const WooWebhookPayloadSchema = z
  .object({
    id: z.number().int(),
    number: z.string(),
    order_key: z.string(),
    status: z.string(),
    date_created: z.string(),
    billing: z
      .object({
        email: z.string().email().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
      })
      .passthrough(),
    shipping: z.record(z.unknown()),
    line_items: z.array(z.record(z.unknown())),
    total: z.string(),
    meta_data: z
      .array(
        z.object({
          key: z.string(),
          value: z.unknown(),
        })
      )
      .optional(),
  })
  .passthrough();
