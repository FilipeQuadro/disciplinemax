-- ============================================
-- Setup completo para DisciplinaApp
-- Rodar UMA VEZ no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sigpkpgibybgnszpxyzq/sql
--
-- Pode rodar quantas vezes quiser — é idempotente.
-- ============================================

-- ============================================
-- 1. Schema: adicionar colunas/tabelas que faltam
-- ============================================
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS last_notif_key TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS notifications_sent (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT DEFAULT 'default_user',
  notif_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notif_key)
);

-- ============================================
-- 2. Habilitar RLS em todas as tabelas
-- ============================================
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_sent ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS Policies (anon = chave pública, sem autenticação)
--    Quando implementar auth, trocar para policies baseadas em auth.uid()
-- ============================================

-- Helper: cria policy se não existe (evita erro ao rodar novamente)
-- SELECT/DELETE: USING only | INSERT: WITH CHECK only | UPDATE: USING + WITH CHECK
CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
  p_table TEXT, p_name TEXT, p_cmd TEXT, p_using TEXT, p_with_check TEXT
) RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = p_table AND policyname = p_name
  ) THEN
    IF p_cmd = 'SELECT' OR p_cmd = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO anon USING (%s)',
        p_name, p_table, p_cmd, p_using
      );
    ELSIF p_cmd = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO anon WITH CHECK (%s)',
        p_name, p_table, p_cmd, p_with_check
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR %s TO anon USING (%s) WITH CHECK (%s)',
        p_name, p_table, p_cmd, p_using, p_with_check
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- BOOKS
SELECT create_policy_if_not_exists('books', 'Allow anon select on books', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('books', 'Allow anon insert on books', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('books', 'Allow anon update on books', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('books', 'Allow anon delete on books', 'DELETE', 'true', 'true');

-- BIBLE_GOALS
SELECT create_policy_if_not_exists('bible_goals', 'Allow anon select on bible_goals', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('bible_goals', 'Allow anon insert on bible_goals', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('bible_goals', 'Allow anon update on bible_goals', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('bible_goals', 'Allow anon delete on bible_goals', 'DELETE', 'true', 'true');

-- BIBLE_READINGS
SELECT create_policy_if_not_exists('bible_readings', 'Allow anon select on bible_readings', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('bible_readings', 'Allow anon insert on bible_readings', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('bible_readings', 'Allow anon update on bible_readings', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('bible_readings', 'Allow anon delete on bible_readings', 'DELETE', 'true', 'true');

-- DAILY_STATS
SELECT create_policy_if_not_exists('daily_stats', 'Allow anon select on daily_stats', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('daily_stats', 'Allow anon insert on daily_stats', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('daily_stats', 'Allow anon update on daily_stats', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('daily_stats', 'Allow anon delete on daily_stats', 'DELETE', 'true', 'true');

-- POMODORO_SESSIONS
SELECT create_policy_if_not_exists('pomodoro_sessions', 'Allow anon select on pomodoro_sessions', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('pomodoro_sessions', 'Allow anon insert on pomodoro_sessions', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('pomodoro_sessions', 'Allow anon update on pomodoro_sessions', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('pomodoro_sessions', 'Allow anon delete on pomodoro_sessions', 'DELETE', 'true', 'true');

-- USER_SETTINGS
SELECT create_policy_if_not_exists('user_settings', 'Allow anon select on user_settings', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('user_settings', 'Allow anon insert on user_settings', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('user_settings', 'Allow anon update on user_settings', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('user_settings', 'Allow anon delete on user_settings', 'DELETE', 'true', 'true');

-- NOTIFICATION_SUBSCRIPTIONS
SELECT create_policy_if_not_exists('notification_subscriptions', 'Allow anon select on notification_subscriptions', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('notification_subscriptions', 'Allow anon insert on notification_subscriptions', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('notification_subscriptions', 'Allow anon update on notification_subscriptions', 'UPDATE', 'true', 'true');
SELECT create_policy_if_not_exists('notification_subscriptions', 'Allow anon delete on notification_subscriptions', 'DELETE', 'true', 'true');

-- NOTIFICATIONS_SENT
SELECT create_policy_if_not_exists('notifications_sent', 'Allow anon select on notifications_sent', 'SELECT', 'true', 'true');
SELECT create_policy_if_not_exists('notifications_sent', 'Allow anon insert on notifications_sent', 'INSERT', 'true', 'true');
SELECT create_policy_if_not_exists('notifications_sent', 'Allow anon delete on notifications_sent', 'DELETE', 'true', 'true');

-- Limpar helper
DROP FUNCTION IF EXISTS create_policy_if_not_exists(TEXT, TEXT, TEXT, TEXT, TEXT);
