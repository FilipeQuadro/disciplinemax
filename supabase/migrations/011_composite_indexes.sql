-- =============================================================
-- Migration 011: Composite Indexes for Performance
-- Targets the exact query patterns used by dashboard, gamification,
-- feed, and leaderboard. Uses CONCURRENTLY-safe IF NOT EXISTS.
-- =============================================================

-- ── product_events — feed queries filter by event_type + order by created_at ──
CREATE INDEX IF NOT EXISTS idx_product_events_type_created
  ON product_events (event_type, created_at DESC);

-- ── user_achievements — gamification checks all achievements for a user ──
-- Already have idx_user_achievements_user on (user_id, completed)
-- but gamification always fetches all for a user, so this suffices.

-- ── user_challenges — active challenge lookups ──
-- Already have idx_user_challenges_active on (user_id, completed) WHERE completed = false
-- Add composite for weekly challenge queries
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_week
  ON user_challenges (user_id, week_key, completed);

-- ── xp_events — dashboard + gamification queries ──
-- Already have idx_xp_events_user on (user_id, created_at DESC)
-- No additional index needed.

-- ── daily_stats — dashboard week/calendar queries already covered by idx_daily_stats_user_date ──

-- ── books — dashboard + gamification queries ──
-- Already have idx_books_user_id on (user_id)
-- Add composite for dashboard reordering
CREATE INDEX IF NOT EXISTS idx_books_user_created
  ON books (user_id, created_at ASC);

-- ── pomodoro_sessions — gamification count queries ──
-- Already have idx_pomodoro_sessions_completed_started on (user_id, completed, started_at) WHERE completed = true
-- No additional index needed.

-- ── bible_readings — gamification + dashboard count queries ──
-- Already have idx_bible_readings_user_read_at on (user_id, read_at)
-- Add partial index for today's readings (dashboard hot path)
CREATE INDEX IF NOT EXISTS idx_bible_readings_user_today
  ON bible_readings (user_id, read_at DESC)
  WHERE read_at >= CURRENT_DATE;

-- ── user_profiles — public profile + leaderboard lookups ──
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_xp
  ON user_profiles (total_pages DESC)
  WHERE is_public = true;

-- ── notification_queue — retry processing ──
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled
  ON notification_queue (status, scheduled_for)
  WHERE status = 'pending';
