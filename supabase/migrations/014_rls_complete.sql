-- Migration 014: Complete RLS on all remaining tables (IDEMPOTENT)
-- Week 11 — Security, Audit & Production Validation
-- Enables Row Level Security on 20 tables that previously had no RLS.
-- Safe to re-run: drops existing policies before recreating them.
--
-- Principles:
--   - authenticated users can only access their own data (user_id = auth.uid()::text)
--   - anon role has NO access (must authenticate first)
--   - service_role bypasses RLS (used by admin/cron/health routes)
--   - system tables (metrics, analytics) are read-only for authenticated users
--   - friendship/profile queries allow cross-user access where needed

-- ═══════════════════════════════════════════════════════════════
-- 1. GAMIFICATION TABLES (6)
-- ═══════════════════════════════════════════════════════════════

-- user_streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_streaks_select" ON user_streaks;
DROP POLICY IF EXISTS "user_streaks_insert" ON user_streaks;
DROP POLICY IF EXISTS "user_streaks_update" ON user_streaks;
DROP POLICY IF EXISTS "user_streaks_delete" ON user_streaks;
CREATE POLICY "user_streaks_select" ON user_streaks FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_streaks_insert" ON user_streaks FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_streaks_update" ON user_streaks FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_streaks_delete" ON user_streaks FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- user_achievements
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_achievements_select" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_insert" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_update" ON user_achievements;
DROP POLICY IF EXISTS "user_achievements_delete" ON user_achievements;
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_achievements_update" ON user_achievements FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_achievements_delete" ON user_achievements FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- user_xp
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_xp_select" ON user_xp;
DROP POLICY IF EXISTS "user_xp_insert" ON user_xp;
DROP POLICY IF EXISTS "user_xp_update" ON user_xp;
DROP POLICY IF EXISTS "user_xp_delete" ON user_xp;
CREATE POLICY "user_xp_select" ON user_xp FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_xp_insert" ON user_xp FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_xp_update" ON user_xp FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_xp_delete" ON user_xp FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- xp_events
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "xp_events_select" ON xp_events;
DROP POLICY IF EXISTS "xp_events_insert" ON xp_events;
DROP POLICY IF EXISTS "xp_events_delete" ON xp_events;
CREATE POLICY "xp_events_select" ON xp_events FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "xp_events_insert" ON xp_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "xp_events_delete" ON xp_events FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- user_challenges
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_challenges_select" ON user_challenges;
DROP POLICY IF EXISTS "user_challenges_insert" ON user_challenges;
DROP POLICY IF EXISTS "user_challenges_update" ON user_challenges;
DROP POLICY IF EXISTS "user_challenges_delete" ON user_challenges;
CREATE POLICY "user_challenges_select" ON user_challenges FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_challenges_insert" ON user_challenges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_challenges_update" ON user_challenges FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_challenges_delete" ON user_challenges FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- user_insights
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_insights_select" ON user_insights;
DROP POLICY IF EXISTS "user_insights_insert" ON user_insights;
DROP POLICY IF EXISTS "user_insights_delete" ON user_insights;
CREATE POLICY "user_insights_select" ON user_insights FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_insights_insert" ON user_insights FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_insights_delete" ON user_insights FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- 2. COMMUNITY TABLES (9)
-- ═══════════════════════════════════════════════════════════════

-- user_profiles — owner has full CRUD; anyone can SELECT public profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_public" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON user_profiles;
CREATE POLICY "user_profiles_select_own" ON user_profiles FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_profiles_select_public" ON user_profiles FOR SELECT TO authenticated USING (is_public = true);
CREATE POLICY "user_profiles_insert" ON user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_profiles_update" ON user_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_profiles_delete" ON user_profiles FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- friendships — users can see friendships they are part of (requester or addressee)
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friendships_select" ON friendships;
DROP POLICY IF EXISTS "friendships_insert" ON friendships;
DROP POLICY IF EXISTS "friendships_update" ON friendships;
DROP POLICY IF EXISTS "friendships_delete" ON friendships;
CREATE POLICY "friendships_select" ON friendships FOR SELECT TO authenticated USING (requester_id = auth.uid()::text OR addressee_id = auth.uid()::text);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid()::text);
CREATE POLICY "friendships_update" ON friendships FOR UPDATE TO authenticated USING (requester_id = auth.uid()::text OR addressee_id = auth.uid()::text);
CREATE POLICY "friendships_delete" ON friendships FOR DELETE TO authenticated USING (requester_id = auth.uid()::text OR addressee_id = auth.uid()::text);

-- referrals — users can see referrals they gave or received
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select" ON referrals;
DROP POLICY IF EXISTS "referrals_insert" ON referrals;
DROP POLICY IF EXISTS "referrals_delete" ON referrals;
CREATE POLICY "referrals_select" ON referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid()::text OR invitee_id = auth.uid()::text);
CREATE POLICY "referrals_insert" ON referrals FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid()::text);
CREATE POLICY "referrals_delete" ON referrals FOR DELETE TO authenticated USING (referrer_id = auth.uid()::text);

-- groups — anyone authenticated can see groups; only members can join/leave
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "groups_select" ON groups;
DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "groups_insert" ON groups FOR INSERT TO authenticated WITH CHECK (true);

-- group_members — users can see members of any group; can join/leave for themselves
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "group_members_select" ON group_members;
DROP POLICY IF EXISTS "group_members_insert" ON group_members;
DROP POLICY IF EXISTS "group_members_delete" ON group_members;
CREATE POLICY "group_members_select" ON group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "group_members_insert" ON group_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "group_members_delete" ON group_members FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- community_challenges — anyone authenticated can see active challenges
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_challenges_select" ON community_challenges;
DROP POLICY IF EXISTS "community_challenges_insert" ON community_challenges;
CREATE POLICY "community_challenges_select" ON community_challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_challenges_insert" ON community_challenges FOR INSERT TO authenticated WITH CHECK (true);

-- community_challenge_progress — users can see all progress; can only contribute as themselves
ALTER TABLE community_challenge_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_challenge_progress_select" ON community_challenge_progress;
DROP POLICY IF EXISTS "community_challenge_progress_insert" ON community_challenge_progress;
DROP POLICY IF EXISTS "community_challenge_progress_update" ON community_challenge_progress;
CREATE POLICY "community_challenge_progress_select" ON community_challenge_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "community_challenge_progress_insert" ON community_challenge_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "community_challenge_progress_update" ON community_challenge_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- growth_metrics — system table; read-only for authenticated users
ALTER TABLE growth_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "growth_metrics_select" ON growth_metrics;
CREATE POLICY "growth_metrics_select" ON growth_metrics FOR SELECT TO authenticated USING (true);

-- sharing_events — users can see their own sharing events
ALTER TABLE sharing_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sharing_events_select" ON sharing_events;
DROP POLICY IF EXISTS "sharing_events_insert" ON sharing_events;
CREATE POLICY "sharing_events_select" ON sharing_events FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "sharing_events_insert" ON sharing_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- 3. SYSTEM TABLES (4)
-- ═══════════════════════════════════════════════════════════════

-- NOTE: metrics_snapshots does not exist in production database yet.
-- When it is created, add: ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;
-- and: CREATE POLICY "metrics_snapshots_select" ON metrics_snapshots FOR SELECT TO authenticated USING (true);

-- notification_queue — users can see their own queued notifications
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_queue_select" ON notification_queue;
CREATE POLICY "notification_queue_select" ON notification_queue FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- product_analytics — system table; read-only for authenticated users
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_analytics_select" ON product_analytics;
CREATE POLICY "product_analytics_select" ON product_analytics FOR SELECT TO authenticated USING (true);

-- product_events — users can see their own events
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_events_select" ON product_events;
DROP POLICY IF EXISTS "product_events_insert" ON product_events;
CREATE POLICY "product_events_select" ON product_events FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "product_events_insert" ON product_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

-- onboarding_progress — users can only access their own onboarding state
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_progress_select" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_insert" ON onboarding_progress;
DROP POLICY IF EXISTS "onboarding_progress_update" ON onboarding_progress;
CREATE POLICY "onboarding_progress_select" ON onboarding_progress FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "onboarding_progress_insert" ON onboarding_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "onboarding_progress_update" ON onboarding_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()::uuid) WITH CHECK (user_id = auth.uid()::uuid);
