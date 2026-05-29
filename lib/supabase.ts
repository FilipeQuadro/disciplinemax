import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

// Tipos do banco de dados
export type Book = {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  cover_url?: string;
  total_pages: number;
  current_page: number;
  daily_goal: number;
  pages_read_today: number;
  target_date?: string;
  color: string;
  created_at: string;
  updated_at: string;
};

export type BibleReading = {
  id: string;
  user_id: string;
  book_name: string;
  chapter: number;
  verse_start?: number;
  verse_end?: number;
  notes?: string;
  read_at: string;
  created_at: string;
};

export type BibleGoal = {
  id: string;
  user_id: string;
  daily_chapters: number;
  current_book: string;
  current_chapter: number;
  plan_name?: string;
  start_date: string;
  updated_at: string;
};

export type PomodoroSession = {
  id: string;
  user_id: string;
  duration_minutes: number;
  break_minutes: number;
  completed: boolean;
  task_name?: string;
  started_at: string;
  ended_at?: string;
};

export type DailyStats = {
  id: string;
  user_id: string;
  date: string;
  books_pages_read: number;
  bible_chapters_read: number;
  pomodoros_completed: number;
  total_focus_minutes: number;
  goals_completed: boolean;
  streak_day: number;
};

export type NotificationSub = {
  id: string;
  user_id: string;
  platform: string;
  endpoint?: string;
  p256dh?: string;
  auth?: string;
  device_token?: string;
  bundle_id?: string;
  created_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  whatsapp_number?: string;
  greenapi_instance_id?: string;
  greenapi_token?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  notification_times: string[];
  pomodoro_duration: number;
  short_break: number;
  long_break: number;
  pomodoros_until_long: number;
  daily_books_goal: number;
  daily_bible_chapters: number;
  gemini_api_key?: string;
  timezone: string;
  streak_freeze_available?: number;
  streak_freeze_used?: number;
  streak_freeze_reset_month?: string;
  updated_at: string;
};
