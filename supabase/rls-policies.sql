-- ============================================
-- RLS Policies — SaaS Multi-Usuário
-- Rodar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql
--
-- Agora cada usuário só vê seus próprios dados.
-- Service role bypassa RLS (cron/doctor/health/admin APIs).
-- ============================================

-- ============================================
-- 1. Habilitar RLS em todas as tabelas
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

-- ============================================
-- 2. Drop todas as policies existentes (anon open)
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
-- 3. Novas policies — authenticated users veem só seus dados
--    anon role: sem acesso (necessário login)
--    authenticated role: full CRUD em seus próprios dados
-- ============================================

-- BOOKS
CREATE POLICY "books_select" ON books FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "books_insert" ON books FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "books_update" ON books FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "books_delete" ON books FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- BIBLE_GOALS
CREATE POLICY "bible_goals_select" ON bible_goals FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_insert" ON bible_goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_update" ON bible_goals FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_goals_delete" ON bible_goals FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- BIBLE_READINGS
CREATE POLICY "bible_readings_select" ON bible_readings FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_insert" ON bible_readings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_update" ON bible_readings FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "bible_readings_delete" ON bible_readings FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- DAILY_STATS
CREATE POLICY "daily_stats_select" ON daily_stats FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_insert" ON daily_stats FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_update" ON daily_stats FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "daily_stats_delete" ON daily_stats FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- POMODORO_SESSIONS
CREATE POLICY "pomodoro_sessions_select" ON pomodoro_sessions FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_insert" ON pomodoro_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_update" ON pomodoro_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "pomodoro_sessions_delete" ON pomodoro_sessions FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- USER_SETTINGS
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- NOTIFICATION_SUBSCRIPTIONS
CREATE POLICY "notification_subscriptions_select" ON notification_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_insert" ON notification_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_update" ON notification_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notification_subscriptions_delete" ON notification_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- NOTIFICATIONS_SENT
CREATE POLICY "notifications_sent_select" ON notifications_sent FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "notifications_sent_insert" ON notifications_sent FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "notifications_sent_delete" ON notifications_sent FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- ACHIEVEMENTS
CREATE POLICY "achievements_select" ON achievements FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "achievements_insert" ON achievements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_update" ON achievements FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "achievements_delete" ON achievements FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- ============================================
-- 4. Novas tabelas — Admin + Plans
-- ============================================

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  user_id TEXT PRIMARY KEY,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  added_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

-- User plans
CREATE TABLE IF NOT EXISTS user_plans (
  user_id TEXT PRIMARY KEY,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_plans_select" ON user_plans FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "user_plans_insert" ON user_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "user_plans_update" ON user_plans FOR UPDATE TO authenticated USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- Streak freeze columns (se ainda não existem)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_available INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_used INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_reset_month TEXT DEFAULT '';

-- ============================================
-- 5. Auto-create user_plans row for new users via trigger
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_plans (user_id, plan) VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
