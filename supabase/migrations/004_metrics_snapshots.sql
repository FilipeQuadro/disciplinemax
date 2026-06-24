-- =============================================================
-- DisciplinaMax — Metrics Snapshots Table
-- Persists in-memory metrics to survive deploys and restarts
-- =============================================================

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_type TEXT NOT NULL,       -- 'counter', 'gauge', 'histogram'
  metric_key TEXT NOT NULL,          -- e.g. 'cron_runs|status=success'
  metric_value JSONB NOT NULL,       -- number for counters/gauges, stats object for histograms
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying recent snapshots
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_captured_at
  ON metrics_snapshots (captured_at DESC);

-- Index for looking up specific metrics
CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_type_key
  ON metrics_snapshots (snapshot_type, metric_key, captured_at DESC);

-- Auto-cleanup: keep only last 7 days of metrics
-- Run via cron or pg_cron if available
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM metrics_snapshots WHERE captured_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
