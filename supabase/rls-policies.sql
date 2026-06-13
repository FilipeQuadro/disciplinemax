-- ============================================
-- RLS Policies — SaaS Multi-Usuário (Synchronized with Production)
-- Rodar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql
--
-- Principles:
--   - authenticated users can only access their own data (user_id = auth.uid()::text)
--   - anon role has NO access (no grants, no policies)
--   - service_role bypasses RLS (used by admin/cron/health routes)
--   - system tables (metrics, analytics) are read-only for authenticated users
--   - friendship/profile queries allow cross-user access where needed
-- ============================================

-- ============================================
-- 1. Enable RLS on all tables
-- ============================================
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Drop all legacy "Allow anon *" policies
-- ============================================
DROP POLICY IF EXISTS "Allow anon select on books" ON books;
DROP POLICY IF EXISTS "Allow anon insert on books" ON books;
DROP POLICY IF EXISTS "Allow anon update on books" ON books;
DROP POLICY IF EXISTS "Allow anon delete on books" ON books;
DROP POLICY IF EXISTS "Allow anon select on bible_goals" ON bible_goals;
DROP POLICY IF EXISTS "Allow anon insert on bible_goals" ON bible_goals;
DROP POLICY IF EXISTS "Allow anon update on bible_goals" ON bible_goals;
DROP POLICY IF EXISTS "Allow anon delete on bible_goals" ON bible_goals;
DROP POLICY IF EXISTS "Allow anon select on bible_readings" ON bible_readings;
DROP POLICY IF EXISTS "Allow anon insert on bible_readings" ON bible_readings;
DROP POLICY IF EXISTS "Allow anon update on bible_readings" ON bible_readings;
DROP POLICY IF EXISTS "Allow anon delete on bible_readings" ON bible_readings;
DROP POLICY IF EXISTS "Allow anon select on daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anon insert on daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anon update on daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anon delete on daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Allow anon select on pomodoro_sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anon insert on pomodoro_sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anon update on pomodoro_sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anon delete on pomodoro_sessions" ON pomodoro_sessions;
DROP POLICY IF EXISTS "Allow anon select on user_settings" ON user_settings;
DROP POLICY IF EXISTS "Allow anon insert on user_settings" ON user_settings;
DROP POLICY IF EXISTS "Allow anon update on user_settings" ON user_settings;
DROP POLICY IF EXISTS "Allow anon delete on user_settings" ON user_settings;
DROP POLICY IF EXISTS "Allow anon select on notification_subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Allow anon insert on notification_subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Allow anon update on notification_subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Allow anon delete on notification_subscriptions" ON notification_subscriptions;
DROP POLICY IF EXISTS "Allow anon select on notifications_sent" ON notifications_sent;
DROP POLICY IF EXISTS "Allow anon insert on notifications_sent" ON notifications_sent;
DROP POLICY IF EXISTS "Allow anon delete on notifications_sent" ON notifications_sent;
DROP POLICY IF EXISTS "Allow anon select on achievements" ON achievements;
DROP POLICY IF EXISTS "Allow anon insert on achievements" ON achievements;
DROP POLICY IF EXISTS "Allow anon update on achievements" ON achievements;
DROP POLICY IF EXISTS "Allow anon delete on achievements" ON achievements;

-- ============================================
-- 3. Core tables — user-scoped CRUD + service_role bypass
-- ============================================

-- BOOKS
DROP POLICY IF EXISTS "books_select" ON books;
DROP POLICY IF EXISTS "books_insert" ON books;
DROP POLICY IF EXISTS "books_update" ON books;
DROP POLICY IF EXISTS "books_delete" ON books;
DROP POLICY IF EXISTS "books_service_all" ON books;
CREATE POLICY "books_select" ON books FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "books_insert" ON books FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "books_update" ON books FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "books_delete" ON books FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "books_service_all" ON books TO service_role USING (true) WITH CHECK (true);

-- BIBLE_GOALS
DROP POLICY IF EXISTS "bible_goals_select" ON bible_goals;
DROP POLICY IF EXISTS "bible_goals_insert" ON bible_goals;
DROP POLICY IF EXISTS "bible_goals_update" ON bible_goals;
DROP POLICY IF EXISTS "bible_goals_delete" ON bible_goals;
DROP POLICY IF EXISTS "bible_goals_service_all" ON bible_goals;
CREATE POLICY "bible_goals_select" ON bible_goals FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_insert" ON bible_goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_update" ON bible_goals FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_delete" ON bible_goals FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_service_all" ON bible_goals TO service_role USING (true) WITH CHECK (true);

-- BIBLE_READINGS
DROP POLICY IF EXISTS "bible_readings_select" ON bible_readings;
DROP POLICY IF EXISTS "bible_readings_insert" ON bible_readings;
DROP POLICY IF EXISTS "bible_readings_update" ON bible_readings;
DROP POLICY IF EXISTS "bible_readings_delete" ON bible_readings;
DROP POLICY IF EXISTS "bible_readings_service_all" ON bible_readings;
CREATE POLICY "bible_readings_select" ON bible_readings FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_insert" ON bible_readings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_update" ON bible_readings FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_delete" ON bible_readings FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_service_all" ON bible_readings TO service_role USING (true) WITH CHECK (true);

-- DAILY_STATS
DROP POLICY IF EXISTS "daily_stats_select" ON daily_stats;
DROP POLICY IF EXISTS "daily_stats_insert" ON daily_stats;
DROP POLICY IF EXISTS "daily_stats_update" ON daily_stats;
DROP POLICY IF EXISTS "daily_stats_delete" ON daily_stats;
DROP POLICY IF EXISTS "daily_stats_service_all" ON daily_stats;
CREATE POLICY "daily_stats_select" ON daily_stats FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_insert" ON daily_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_update" ON daily_stats FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_delete" ON daily_stats FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_service_all" ON daily_stats TO service_role USING (true) WITH CHECK (true);

-- POMODORO_SESSIONS
DROP POLICY IF EXISTS "pomodoro_sessions_select" ON pomodoro_sessions;
DROP POLICY IF EXISTS "pomodoro_sessions_insert" ON pomodoro_sessions;
DROP POLICY IF EXISTS "pomodoro_sessions_update" ON pomodoro_sessions;
DROP POLICY IF EXISTS "pomodoro_sessions_delete" ON pomodoro_sessions;
DROP POLICY IF EXISTS "pomodoro_sessions_service_all" ON pomodoro_sessions;
CREATE POLICY "pomodoro_sessions_select" ON pomodoro_sessions FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_insert" ON pomodoro_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_update" ON pomodoro_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_delete" ON pomodoro_sessions FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_service_all" ON pomodoro_sessions TO service_role USING (true) WITH CHECK (true);

-- USER_SETTINGS
DROP POLICY IF EXISTS "user_settings_select" ON user_settings;
DROP POLICY IF EXISTS "user_settings_insert" ON user_settings;
DROP POLICY IF EXISTS "user_settings_update" ON user_settings;
DROP POLICY IF EXISTS "user_settings_delete" ON user_settings;
DROP POLICY IF EXISTS "user_settings_service_all" ON user_settings;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_settings_service_all" ON user_settings TO service_role USING (true) WITH CHECK (true);

-- NOTIFICATION_SUBSCRIPTIONS
DROP POLICY IF EXISTS "notification_subscriptions_select" ON notification_subscriptions;
DROP POLICY IF EXISTS "notification_subscriptions_insert" ON notification_subscriptions;
DROP POLICY IF EXISTS "notification_subscriptions_update" ON notification_subscriptions;
DROP POLICY IF EXISTS "notification_subscriptions_delete" ON notification_subscriptions;
DROP POLICY IF EXISTS "notification_subscriptions_service_all" ON notification_subscriptions;
CREATE POLICY "notification_subscriptions_select" ON notification_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_insert" ON notification_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_update" ON notification_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_delete" ON notification_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_service_all" ON notification_subscriptions TO service_role USING (true) WITH CHECK (true);

-- NOTIFICATIONS_SENT
DROP POLICY IF EXISTS "notifications_sent_select" ON notifications_sent;
DROP POLICY IF EXISTS "notifications_sent_insert" ON notifications_sent;
DROP POLICY IF EXISTS "notifications_sent_delete" ON notifications_sent;
DROP POLICY IF EXISTS "notifications_sent_service_all" ON notifications_sent;
CREATE POLICY "notifications_sent_select" ON notifications_sent FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notifications_sent_insert" ON notifications_sent FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notifications_sent_delete" ON notifications_sent FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notifications_sent_service_all" ON notifications_sent TO service_role USING (true) WITH CHECK (true);

-- ACHIEVEMENTS
DROP POLICY IF EXISTS "achievements_select" ON achievements;
DROP POLICY IF EXISTS "achievements_insert" ON achievements;
DROP POLICY IF EXISTS "achievements_update" ON achievements;
DROP POLICY IF EXISTS "achievements_delete" ON achievements;
DROP POLICY IF EXISTS "achievements_service_all" ON achievements;
CREATE POLICY "achievements_select" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "achievements_service_all" ON achievements TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 4. Admin + Plans + Audit + Blocked tables
-- ============================================

-- ADMIN_USERS (no insert policy — admin promotion via service_role only)
DROP POLICY IF EXISTS "admin_users_select" ON admin_users;
DROP POLICY IF EXISTS "admin_users_service_all" ON admin_users;
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "admin_users_service_all" ON admin_users TO service_role USING (true) WITH CHECK (true);

-- USER_PLANS
DROP POLICY IF EXISTS "user_plans_select" ON user_plans;
DROP POLICY IF EXISTS "user_plans_insert" ON user_plans;
DROP POLICY IF EXISTS "user_plans_update" ON user_plans;
DROP POLICY IF EXISTS "user_plans_service_all" ON user_plans;
CREATE POLICY "user_plans_select" ON user_plans FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_plans_insert" ON user_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_plans_update" ON user_plans FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_plans_service_all" ON user_plans TO service_role USING (true) WITH CHECK (true);

-- AUDIT_LOGS (insert restricted to own actor_id)
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_all" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT TO authenticated USING (actor_id = auth.uid()::text);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid()::text);
CREATE POLICY "audit_logs_service_all" ON audit_logs TO service_role USING (true) WITH CHECK (true);

-- BLOCKED_USERS (users can only see their own blocked status)
DROP POLICY IF EXISTS "blocked_users_select" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_service_all" ON blocked_users;
CREATE POLICY "blocked_users_select" ON blocked_users FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "blocked_users_service_all" ON blocked_users TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 5. Auto-create user_plans row for new users via trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_plans (user_id, plan) VALUES (NEW.id, 'free');
  INSERT INTO user_settings (user_id, notification_times, pomodoro_duration, short_break, long_break, pomodoros_until_long, daily_books_goal, daily_bible_chapters, timezone)
    VALUES (NEW.id::text, ARRAY['07:00','12:00','19:00'], 25, 5, 15, 4, 20, 3, 'America/Sao_Paulo')
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO bible_goals (user_id, daily_chapters, plan_name)
    VALUES (NEW.id::text, 3, 'custom')
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON daily_stats(user_id, date);
