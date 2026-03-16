-- Security foundation: durable rate limiting and supporting indexes

CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope text NOT NULL,
  subject_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, subject_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_updated_at
  ON request_rate_limits(updated_at);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_scope text,
  p_subject_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, remaining integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window timestamptz;
  next_count integer;
BEGIN
  current_window :=
    to_timestamp(
      floor(extract(epoch from now()) / GREATEST(p_window_seconds, 1)) * GREATEST(p_window_seconds, 1)
    );

  INSERT INTO public.request_rate_limits (scope, subject_key, window_start, count, updated_at)
  VALUES (p_scope, p_subject_key, current_window, 1, now())
  ON CONFLICT (scope, subject_key, window_start)
  DO UPDATE SET
    count = public.request_rate_limits.count + 1,
    updated_at = now()
  RETURNING request_rate_limits.count INTO next_count;

  RETURN QUERY
  SELECT
    next_count <= p_limit,
    GREATEST(p_limit - next_count, 0),
    current_window + make_interval(secs => GREATEST(p_window_seconds, 1));
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO authenticated;
