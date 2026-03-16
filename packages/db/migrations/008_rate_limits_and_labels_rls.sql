ALTER TABLE request_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on request_rate_limits" ON request_rate_limits;
CREATE POLICY "Service role only on request_rate_limits"
  ON request_rate_limits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view own shipping_labels" ON shipping_labels;
CREATE POLICY "Org members can view own shipping_labels"
  ON shipping_labels
  FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Service role can manage shipping_labels" ON shipping_labels;
CREATE POLICY "Service role can manage shipping_labels"
  ON shipping_labels
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
