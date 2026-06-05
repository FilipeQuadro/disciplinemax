-- Week 8: Community — Profiles, Friendships, Referrals, Groups, Community Events, Growth Metrics
-- Consolidated migration for all social/growth tables

-- ═══════════════════════════════════════════════════════════════
-- USER PROFILES — Public profile with username and referral code
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT UNIQUE,
  books_completed INT NOT NULL DEFAULT 0,
  total_pages INT NOT NULL DEFAULT 0,
  pomodoros_total INT NOT NULL DEFAULT 0,
  bible_chapters_total INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username
  ON user_profiles (username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_referral
  ON user_profiles (referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_public
  ON user_profiles (is_public)
  WHERE is_public = true;

-- ═══════════════════════════════════════════════════════════════
-- FRIENDSHIPS — Bidirectional friendship with status
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON friendships (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON friendships (addressee_id, status);

-- ═══════════════════════════════════════════════════════════════
-- REFERRALS — Track who invited whom
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL,
  invitee_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals (referrer_id);

-- ═══════════════════════════════════════════════════════════════
-- GROUPS — Simple groups with internal rankings
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_slug
  ON groups (slug);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group
  ON group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON group_members (user_id);

-- ═══════════════════════════════════════════════════════════════
-- COMMUNITY CHALLENGES — Global collective challenges
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_type TEXT NOT NULL CHECK (target_type IN ('pomodoros', 'pages', 'bible_chapters', 'books')),
  target_value INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES community_challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  contribution INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_challenge_progress_challenge
  ON community_challenge_progress (challenge_id);

-- ═══════════════════════════════════════════════════════════════
-- GROWTH METRICS — Track growth KPIs over time
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS growth_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_growth_metrics_name_date
  ON growth_metrics (metric_name, date DESC);

-- ═══════════════════════════════════════════════════════════════
-- SHARING EVENTS — Track when users share content
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sharing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  share_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sharing_events_user
  ON sharing_events (user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- CLEANUP FUNCTION — community data retention
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_community()
RETURNS void AS $$
BEGIN
  DELETE FROM sharing_events WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM growth_metrics WHERE date < CURRENT_DATE - INTERVAL '180 days';
  DELETE FROM community_challenge_progress ccp
    WHERE NOT EXISTS (
      SELECT 1 FROM community_challenges cc WHERE cc.id = ccp.challenge_id
    );
END;
$$ LANGUAGE plpgsql;
