export const MIGRATION_FILES = [
  '001_initial_schema.sql',
  '002_users_self_service.sql',
  '003_membership_policy_helpers.sql',
  '004_storage_rls.sql',
  '005_security_foundation.sql',
  '006_viewer_and_shipping_state.sql',
  '007_webhook_idempotency.sql',
  '008_rate_limits_and_labels_rls.sql',
] as const;

export type MigrationFile = (typeof MIGRATION_FILES)[number];
