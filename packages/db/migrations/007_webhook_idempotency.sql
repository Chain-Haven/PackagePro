ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_store_idempotency
  ON webhook_deliveries(store_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
