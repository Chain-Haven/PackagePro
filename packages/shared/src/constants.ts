export const ORDER_LOCK_DEFAULT_MINUTES = 30;
export const ORDER_LOCK_MAX_MINUTES = 120;
export const VIDEO_SIGNED_URL_EXPIRY_SECONDS = 3600;
export const VIDEO_MAX_DURATION_SECONDS = 600; // 10 minutes
export const VIDEO_DEFAULT_RESOLUTION = '1280x720';
export const VIEWER_TOKEN_BYTES = 32;
export const VIEWER_RATE_LIMIT_PER_MIN = 10;
export const UPLOAD_MAX_RETRIES = 5;
export const UPLOAD_RETRY_DELAY_MS = 5000;
export const STATION_HEARTBEAT_INTERVAL_MS = 30000;
export const PAIRING_CODE_LENGTH = 8;
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

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
