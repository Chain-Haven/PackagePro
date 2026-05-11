import { z } from 'zod';
import { OrderVideoStatus } from './types';
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_FILE_SIZE_BYTES } from './constants';

// Store pairing
export const PairStoreRequestSchema = z.object({
  pairing_code: z.string().min(6).max(64),
});

export const PairStoreResponseSchema = z.object({
  success: z.boolean(),
  paired_at: z.string().datetime().optional(),
  store_name: z.string(),
});

// Station registration
export const RegisterStationRequestSchema = z.object({
  org_id: z.string().uuid().optional(),
  store_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  machine_id: z.string().optional(),
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
  file_name: z.string().min(1),
  content_type: z.enum(ALLOWED_VIDEO_CONTENT_TYPES).default('video/webm'),
  file_size_bytes: z.number().int().positive().max(MAX_VIDEO_FILE_SIZE_BYTES).optional(),
});

export const UploadUrlResponseSchema = z.object({
  video_id: z.string().uuid(),
  upload_url: z.string().url(),
  storage_path: z.string(),
});

export const FinalizeVideoRequestSchema = z.object({
  file_size_bytes: z.number().int().positive().max(MAX_VIDEO_FILE_SIZE_BYTES).optional(),
  duration_seconds: z.number().optional(),
  resolution: z.string().optional(),
});

// ShipStation label
const ShipAddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address_line1: z.string().min(1),
  address_line2: z.string().optional(),
  city_locality: z.string().min(1),
  state_province: z.string().min(1),
  postal_code: z.string().min(1),
  country_code: z.string().length(2).default('US'),
});

const ShipPackageSchema = z.object({
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(['ounce', 'pound', 'gram', 'kilogram']).default('ounce'),
  }),
  dimensions: z
    .object({
      height: z.number().positive(),
      width: z.number().positive(),
      length: z.number().positive(),
      unit: z.enum(['inch', 'centimeter']).default('inch'),
    })
    .optional(),
});

export const CreateLabelRequestSchema = z.object({
  order_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  carrier_id: z.string(),
  service_code: z.string(),
  ship_to: ShipAddressSchema.optional(),
  ship_from: ShipAddressSchema.optional(),
  packages: z.array(ShipPackageSchema).min(1),
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
  playback_url: z.string().url().optional(),
  order_number: z.string(),
  store_name: z.string(),
  recorded_at: z.string().datetime().optional(),
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
    topic: z.string().optional(),
    order: z
      .object({
        id: z.number().int(),
        number: z.string().optional(),
        order_key: z.string().optional(),
        status: z.string(),
        date_created: z.string().optional(),
        billing_email: z.string().email().optional().nullable(),
        billing_first_name: z.string().optional().nullable(),
        billing_last_name: z.string().optional().nullable(),
        shipping: z.record(z.unknown()).optional().nullable(),
        line_items: z.array(z.record(z.unknown())).optional(),
        total: z.union([z.string(), z.number()]).optional(),
        meta_data: z
          .array(
            z.object({
              key: z.string(),
              value: z.unknown(),
            })
          )
          .optional(),
      })
      .optional(),
  })
  .passthrough();
