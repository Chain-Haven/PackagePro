export const ORDER_LOCK_DEFAULT_MINUTES = 30;
export const ORDER_LOCK_MAX_MINUTES = 120;
export const VIDEO_SIGNED_URL_EXPIRY_SECONDS = 3600;
export const VIDEO_MAX_DURATION_SECONDS = 600; // 10 minutes
export const VIDEO_DEFAULT_RESOLUTION = '1280x720';
export const VIEWER_TOKEN_BYTES = 32;
export const DEFAULT_VIEWER_TOKEN_TTL_DAYS = 90;
export const VIEWER_RATE_LIMIT_PER_MIN = 10;
export const API_WRITE_RATE_LIMIT_PER_MIN = 60;
export const API_WRITE_RATE_LIMIT_WINDOW_SECONDS = 60;
export const PAIRING_RATE_LIMIT_PER_HOUR = 20;
export const PAIRING_RATE_LIMIT_WINDOW_SECONDS = 3600;
export const WEBHOOK_RATE_LIMIT_PER_MIN = 120;
export const WEBHOOK_RATE_LIMIT_WINDOW_SECONDS = 60;
export const UPLOAD_MAX_RETRIES = 5;
export const UPLOAD_RETRY_DELAY_MS = 5000;
export const STATION_HEARTBEAT_INTERVAL_MS = 30000;
export const PAIRING_CODE_LENGTH = 8;
export const PAIRING_CODE_TTL_MINUTES = 15;
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const MAX_VIDEO_FILE_SIZE_BYTES = 512 * 1024 * 1024;
export const ALLOWED_VIDEO_CONTENT_TYPES = ['video/webm', 'video/mp4'] as const;

export const WOO_META_KEYS = {
  VIDEO_ID: '_packagepro_video_id',
  VIDEO_STATUS: '_packagepro_video_status',
  STATION_NAME: '_packagepro_station_name',
  RECORDED_AT: '_packagepro_recorded_at',
  VIEWER_TOKEN: '_packagepro_viewer_token',
} as const;

export const STORAGE_BUCKET = 'videos';

export const SHIPSTATION_V1_BASE = 'https://ssapi.shipstation.com';
export const SHIPSTATION_V2_BASE = 'https://api.shipstation.com';
