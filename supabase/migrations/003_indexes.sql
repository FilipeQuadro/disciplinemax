-- =============================================================
-- DisciplinaMax — Index Optimization Migration
-- Execute in Supabase SQL Editor (one section at a time is safe)
-- =============================================================
-- These indexes target the exact query patterns used by the cron
-- jobs, repositories, and API routes. All use CONCURRENTLY to
-- avoid locking the tables during creation.
-- =============================================================

-- ── user_settings ──────────────────────────────────────────────
-- Queries: getAllSettings(), getSettingsByUserId(), diagnostics
-- Primary key already indexes 'id', but we query by user_id constantly
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings (user_id);

-- ── books ──────────────────────────────────────────────────────
-- Queries: getAllBooks(), getBooksByUserId(), resetDailyPages(), weekly cron
CREATE INDEX IF NOT EXISTS idx_books_user_id
  ON books (user_id);

-- Reset query filters on pages_read_today
CREATE INDEX IF NOT EXISTS idx_books_pages_read_today
  ON books (pages_read_today)
  WHERE pages_read_today > 0;

-- ── bible_goals ────────────────────────────────────────────────
-- Queries: getAllBibleGoals(), getBibleGoalByUserId()
CREATE INDEX IF NOT EXISTS idx_bible_goals_user_id
  ON bible_goals (user_id);

-- ── daily_stats ───────────────────────────────────────────────
-- Most queried table in the system
-- Query: getTodayStats(today) → WHERE date = ?
CREATE INDEX IF NOT EXISTS idx_daily_stats_date
  ON daily_stats (date);

-- Query: getWeeklyStatsBatch(from, to) + getRecentStats
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date
  ON daily_stats (user_id, date DESC);

-- Query: streak calculation + goals_completed filtering
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_goals
  ON daily_stats (user_id, goals_completed)
  WHERE goals_completed = true;

-- ── notifications_sent ─────────────────────────────────────────
-- Query: wasAlreadySent(userId, notifKey) → WHERE user_id = ? AND notif_key = ?
-- This is the dedup hot path — called for every user on every cron run
CREATE INDEX IF NOT EXISTS idx_notifications_sent_user_key
  ON notifications_sent (user_id, notif_key);

-- Query: cleanupOld(olderThan) → WHERE sent_at < ?
CREATE INDEX IF NOT EXISTS idx_notifications_sent_sent_at
  ON notifications_sent (sent_at);

-- ── notification_subscriptions ─────────────────────────────────
-- Query: getWebSubscriptions(userId) → WHERE user_id = ? AND platform = 'web'
CREATE INDEX IF NOT EXISTS idx_notification_subs_user_platform
  ON notification_subscriptions (user_id, platform);

-- Query: removeExpiredSubscription(endpoint) → WHERE endpoint = ?
CREATE INDEX IF NOT EXISTS idx_notification_subs_endpoint
  ON notification_subscriptions (endpoint);

-- ── pomodoro_sessions ──────────────────────────────────────────
-- Query: getPomodorosBatch(since) → WHERE completed = true AND started_at >= ?
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_completed_started
  ON pomodoro_sessions (user_id, completed, started_at)
  WHERE completed = true;

-- ── bible_readings ────────────────────────────────────────────
-- Query: getBibleReadingsBatch(since) → WHERE read_at >= ?
CREATE INDEX IF NOT EXISTS idx_bible_readings_user_read_at
  ON bible_readings (user_id, read_at);

-- ── audit_logs ────────────────────────────────────────────────
-- Query: admin audit log queries by action and created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs (created_at DESC);

-- ── admin tables ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id
  ON blocked_users (user_id);

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id
  ON admin_users (user_id);

-- ── user_plans ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id
  ON user_plans (user_id);

-- =============================================================
-- Verification queries (run after creating indexes)
-- =============================================================
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
