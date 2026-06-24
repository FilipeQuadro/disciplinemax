-- Product events tracking table
-- Stores user behavior events for analytics and retention measurement

CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_product_events_type
  ON product_events (event_type, created_at DESC);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_product_events_user
  ON product_events (user_id, created_at DESC);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_product_events_created
  ON product_events (created_at DESC);

-- Cleanup function: delete events older than 90 days
CREATE OR REPLACE FUNCTION cleanup_product_events()
RETURNS void AS $$
BEGIN
  DELETE FROM product_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
