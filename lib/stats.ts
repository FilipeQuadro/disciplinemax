import { format } from "date-fns";
import { supabase, DailyStats } from "@/lib/supabase";

export async function getTodayStats() {
  if (!supabase) return null;
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .maybeSingle();
  return data || null;
}

export async function upsertTodayStats(updates: Partial<Record<string, any>>) {
  if (!supabase) return null;
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: existing } = await supabase
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .maybeSingle() as { data: DailyStats | null };

  const now = new Date().toISOString();

  if (existing) {
    const payload = {
      ...(existing as Record<string, any>),
      ...updates,
      updated_at: now,
    };
    await (supabase.from("daily_stats") as any).update(payload).eq("id", existing.id);
    return payload;
  }

  const payload = {
    id: crypto.randomUUID(),
    user_id: "default_user",
    date: today,
    books_pages_read: 0,
    bible_chapters_read: 0,
    pomodoros_completed: 0,
    total_focus_minutes: 0,
    goals_completed: false,
    streak_day: 0,
    created_at: now,
    updated_at: now,
    ...updates,
  };

  await (supabase.from("daily_stats") as any).insert(payload);
  return payload;
}

export async function getRecentDailyStats(days = 35) {
  if (!supabase) return [];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data } = await supabase
    .from("daily_stats")
    .select("date, goals_completed, books_pages_read, bible_chapters_read")
    .gte("date", format(start, "yyyy-MM-dd"))
    .order("date", { ascending: false });
  return data || [];
}
