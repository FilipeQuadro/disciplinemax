-- Notification retry queue with exponential backoff
-- Stores failed notifications for automatic retry with escalating delays

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'push')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'dead_letter')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 4,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient retry querying
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry
  ON notification_queue (status, next_retry_at)
  WHERE status IN ('pending', 'retrying');

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_notification_queue_user
  ON notification_queue (user_id, status);

-- Cleanup function: delete dead-letter entries older than 30 days
CREATE OR REPLACE FUNCTION cleanup_notification_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM notification_queue
  WHERE status = 'dead_letter'
    AND updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
