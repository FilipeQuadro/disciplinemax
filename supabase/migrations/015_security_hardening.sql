-- Migration 015: Security Hardening — Revoking anon grants, removing default_user, fixing policies
-- Idempotent: safe to re-run
--
-- Changes:
--   1. REVOKE ALL on tables/functions from anon role
--   2. Remove DEFAULT 'default_user' from 8 tables
--   3. Fix audit_logs_insert: WITH CHECK (actor_id = auth.uid()::text)
--   4. Fix blocked_users_select: USING (user_id = auth.uid()::text)
--   5. Delete orphan default_user rows
--   6. Revoke default privileges for anon

-- ═══════════════════════════════════════════════════════════════
-- 1. REVOKE ALL ON TABLES FROM ANON
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. REVOKE ALL ON FUNCTIONS FROM ANON
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
  f TEXT;
BEGIN
  FOR f IN
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM anon', f);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. REVOKE DEFAULT PRIVILEGES FOR ANON
-- ═══════════════════════════════════════════════════════════════
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- ═══════════════════════════════════════════════════════════════
-- 4. REMOVE DEFAULT 'default_user' FROM COLUMNS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE books ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE bible_goals ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE bible_readings ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE daily_stats ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE notification_subscriptions ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE notifications_sent ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE pomodoro_sessions ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE user_settings ALTER COLUMN user_id DROP DEFAULT;

-- ═══════════════════════════════════════════════════════════════
-- 5. FIX audit_logs_insert — prevent spoofing
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- 6. FIX blocked_users_select — restrict to own record
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "blocked_users_select" ON blocked_users;
CREATE POLICY "blocked_users_select" ON blocked_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

-- ═══════════════════════════════════════════════════════════════
-- 7. DELETE ORPHAN default_user ROWS
-- ═══════════════════════════════════════════════════════════════
DELETE FROM achievements WHERE user_id = 'default_user';
DELETE FROM user_settings WHERE user_id = 'default_user';
DELETE FROM bible_goals WHERE user_id = 'default_user';
DELETE FROM books WHERE user_id = 'default_user';
DELETE FROM daily_stats WHERE user_id = 'default_user';
DELETE FROM notification_subscriptions WHERE user_id = 'default_user';
DELETE FROM notifications_sent WHERE user_id = 'default_user';
DELETE FROM pomodoro_sessions WHERE user_id = 'default_user';
