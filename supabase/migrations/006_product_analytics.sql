-- Product analytics snapshot table
-- Stores computed analytics metrics for dashboard display
-- Computed by ProductAnalyticsService and refreshed periodically

CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  dimensions JSONB DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for latest-value queries
CREATE INDEX IF NOT EXISTS idx_product_analytics_key_time
  ON product_analytics (metric_key, captured_at DESC);

-- Cleanup function: delete analytics older than 90 days
CREATE OR REPLACE FUNCTION cleanup_product_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM product_analytics
  WHERE captured_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
