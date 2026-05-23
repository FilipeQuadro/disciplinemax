-- ============================================
-- Setup completo para DisciplinaApp
-- Rodar UMA VEZ no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql
-- ============================================

-- ============================================
-- 1. Adicionar coluna last_notif_key em user_settings
--    (controle de notificação duplicada pelo cron)
-- ============================================
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_notif_key TEXT DEFAULT NULL;

-- ============================================
-- 2. RLS Policies
-- ============================================

-- Garantir que RLS está habilitado em todas as tabelas
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Como o app NÃO tem autenticação (user_id = "default_user"),
-- as policies permitem tudo para o role anon (chave pública).
-- Quando implementar auth, trocar para policies baseadas em user_id.
-- ============================================

-- BOOKS
CREATE POLICY "Allow anon select on books" ON books FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on books" ON books FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on books" ON books FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on books" ON books FOR DELETE TO anon USING (true);

-- BIBLE_GOALS
CREATE POLICY "Allow anon select on bible_goals" ON bible_goals FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on bible_goals" ON bible_goals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on bible_goals" ON bible_goals FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on bible_goals" ON bible_goals FOR DELETE TO anon USING (true);

-- BIBLE_READINGS
CREATE POLICY "Allow anon select on bible_readings" ON bible_readings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on bible_readings" ON bible_readings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on bible_readings" ON bible_readings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on bible_readings" ON bible_readings FOR DELETE TO anon USING (true);

-- DAILY_STATS
CREATE POLICY "Allow anon select on daily_stats" ON daily_stats FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on daily_stats" ON daily_stats FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on daily_stats" ON daily_stats FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on daily_stats" ON daily_stats FOR DELETE TO anon USING (true);

-- POMODORO_SESSIONS
CREATE POLICY "Allow anon select on pomodoro_sessions" ON pomodoro_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on pomodoro_sessions" ON pomodoro_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on pomodoro_sessions" ON pomodoro_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on pomodoro_sessions" ON pomodoro_sessions FOR DELETE TO anon USING (true);

-- USER_SETTINGS
CREATE POLICY "Allow anon select on user_settings" ON user_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on user_settings" ON user_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on user_settings" ON user_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on user_settings" ON user_settings FOR DELETE TO anon USING (true);

-- NOTIFICATION_SUBSCRIPTIONS
CREATE POLICY "Allow anon select on notification_subscriptions" ON notification_subscriptions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on notification_subscriptions" ON notification_subscriptions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on notification_subscriptions" ON notification_subscriptions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on notification_subscriptions" ON notification_subscriptions FOR DELETE TO anon USING (true);
