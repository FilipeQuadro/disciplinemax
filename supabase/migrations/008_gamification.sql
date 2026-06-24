-- Week 7: Gamification — Streaks, Achievements, XP/Levels, Challenges, Insights
-- Consolidated migration for all engagement tables

-- ═══════════════════════════════════════════════════════════════
-- STREAKS — Advanced streak tracking with freeze and history
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  weekly_streak INT NOT NULL DEFAULT 0,
  monthly_streak INT NOT NULL DEFAULT 0,
  streak_freeze_count INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  consistency_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_current
  ON user_streaks (current_streak DESC)
  WHERE current_streak > 0;

-- ═══════════════════════════════════════════════════════════════
-- ACHIEVEMENTS — Server-side achievement tracking
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id, completed);

-- ═══════════════════════════════════════════════════════════════
-- XP & LEVELS — Experience points and leveling
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_xp (
  user_id TEXT PRIMARY KEY,
  total_xp INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  xp_amount INT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user
  ON xp_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_xp_level
  ON user_xp (current_level DESC);

-- ═══════════════════════════════════════════════════════════════
-- CHALLENGES — Weekly challenge system
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  target INT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_reward INT NOT NULL DEFAULT 30,
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, week_key)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_active
  ON user_challenges (user_id, completed)
  WHERE completed = false;

-- ═══════════════════════════════════════════════════════════════
-- INSIGHTS — Auto-generated user insights
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insights_user
  ON user_insights (user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- CLEANUP FUNCTION — gamification data retention
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_gamification()
RETURNS void AS $$
BEGIN
  DELETE FROM xp_events WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM user_insights WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM user_challenges WHERE completed = true AND completed_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
