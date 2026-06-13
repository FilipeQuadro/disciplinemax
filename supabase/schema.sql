-- ============================================
-- DISCIPLINA APP - Schema do Banco de Dados
-- Execute no Supabase SQL Editor
-- ============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: books (Livros)
-- ============================================
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  cover_url TEXT,
  total_pages INTEGER NOT NULL DEFAULT 200,
  current_page INTEGER NOT NULL DEFAULT 0,
  daily_goal INTEGER NOT NULL DEFAULT 20,
  pages_read_today INTEGER NOT NULL DEFAULT 0,
  target_date DATE,
  color TEXT DEFAULT '#7C6BBD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: bible_goals (Meta de leitura bíblica)
-- ============================================
CREATE TABLE IF NOT EXISTS bible_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  daily_chapters INTEGER NOT NULL DEFAULT 3,
  current_book TEXT DEFAULT 'Gênesis',
  current_chapter INTEGER DEFAULT 1,
  plan_name TEXT DEFAULT 'custom',
  start_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- TABELA: bible_readings (Histórico bíblico)
-- ============================================
CREATE TABLE IF NOT EXISTS bible_readings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_start INTEGER,
  verse_end INTEGER,
  notes TEXT,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: pomodoro_sessions (Sessões Pomodoro)
-- ============================================
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  break_minutes INTEGER DEFAULT 5,
  completed BOOLEAN DEFAULT FALSE,
  task_name TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================
-- TABELA: daily_stats (Estatísticas diárias)
-- ============================================
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  books_pages_read INTEGER DEFAULT 0,
  bible_chapters_read INTEGER DEFAULT 0,
  pomodoros_completed INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  goals_completed BOOLEAN DEFAULT FALSE,
  streak_day INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- ============================================
-- TABELA: notification_subscriptions (Push)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  endpoint TEXT UNIQUE,
  p256dh TEXT,
  auth TEXT,
  device_token TEXT UNIQUE,
  bundle_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: user_settings (Configurações)
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT,
  greenapi_instance_id TEXT,
  greenapi_token TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id TEXT,
  notification_times TEXT[] DEFAULT ARRAY['07:00','12:00','19:00'],
  pomodoro_duration INTEGER DEFAULT 25,
  short_break INTEGER DEFAULT 5,
  long_break INTEGER DEFAULT 15,
  pomodoros_until_long INTEGER DEFAULT 4,
  daily_books_goal INTEGER DEFAULT 20,
  daily_bible_chapters INTEGER DEFAULT 3,
  gemini_api_key TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Dados iniciais criados automaticamente pelo trigger handle_new_user()
-- Ver rls-policies.sql para definição do trigger
-- ============================================

-- ============================================
-- FUNÇÃO: Reset diário de páginas lidas
-- (Executar via Supabase Edge Function ou Cron)
-- ============================================
CREATE OR REPLACE FUNCTION reset_daily_pages()
RETURNS void AS $$
BEGIN
  -- Salvar stats do dia anterior antes de resetar
  INSERT INTO daily_stats (user_id, date, books_pages_read, bible_chapters_read)
  SELECT
    user_id,
    CURRENT_DATE - 1,
    SUM(pages_read_today),
    0
  FROM books
  GROUP BY user_id
  ON CONFLICT (user_id, date) DO UPDATE
    SET books_pages_read = EXCLUDED.books_pages_read;

  -- Resetar contadores diários
  UPDATE books SET pages_read_today = 0, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TABELA: notifications_sent (Dedup de notificações)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications_sent (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  notif_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, notif_key)
);

-- ============================================
-- TABELA: achievements (Conquistas)
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);

-- ============================================
-- ADD streak freeze columns to user_settings
-- ============================================
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_available INTEGER DEFAULT 1;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_used INTEGER DEFAULT 0;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS streak_freeze_reset_month TEXT DEFAULT '';

-- ============================================
-- ADD Green-API columns to user_settings
-- ============================================
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS greenapi_instance_id TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS greenapi_token TEXT;

-- ============================================
-- REALTIME: Habilitar sincronização em tempo real
-- ============================================
ALTER TABLE books REPLICA IDENTITY FULL;
ALTER TABLE bible_readings REPLICA IDENTITY FULL;
ALTER TABLE pomodoro_sessions REPLICA IDENTITY FULL;
ALTER TABLE daily_stats REPLICA IDENTITY FULL;

-- Adicionar tabelas ao realtime
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  books, bible_readings, pomodoro_sessions, daily_stats, bible_goals;
COMMIT;
