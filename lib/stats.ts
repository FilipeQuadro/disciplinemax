import { format } from "date-fns";
import { dataFetch } from "@/lib/data-fetch";

export async function getTodayStats(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data } = await dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: userId, date: today }, maybeSingle: true } });
  return data || null;
}

export async function upsertTodayStats(userId: string, updates: Partial<Record<string, any>>) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: existing } = await dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: userId, date: today }, maybeSingle: true } });

  const now = new Date().toISOString();

  if (existing) {
    const payload = { ...existing, ...updates, updated_at: now };
    const { data } = await dataFetch({ action: "update", table: "daily_stats", id: (existing as any).id, payload });
    return data;
  }

  const payload = {
    user_id: userId,
    date: today,
    books_pages_read: 0,
    bible_chapters_read: 0,
    pomodoros_completed: 0,
    total_focus_minutes: 0,
    goals_completed: false,
    streak_day: 0,
    updated_at: now,
    ...updates,
  };
  const { data } = await dataFetch({ action: "insert", table: "daily_stats", payload });
  return data;
}

/**
 * Auto-update daily_stats when pages are read.
 * Call this from logReading in livros page.
 */
export async function trackPagesRead(userId: string, pagesRead: number, totalPagesGoal: number, totalPagesRead: number, bibleChaptersRead: number, bibleGoalChapters: number) {
  const stats: any = await getTodayStats(userId);
  const prevPages = stats?.books_pages_read || 0;
  const newPages = prevPages + pagesRead;
  const booksGoalMet = newPages >= totalPagesGoal;
  const bibleGoalMet = bibleGoalChapters > 0 ? bibleChaptersRead >= bibleGoalChapters : true;

  return upsertTodayStats(userId, {
    books_pages_read: newPages,
    goals_completed: booksGoalMet && bibleGoalMet,
  });
}

/**
 * Auto-update daily_stats when a pomodoro is completed.
 */
export async function trackPomodoroCompleted(userId: string, durationMinutes: number) {
  const stats: any = await getTodayStats(userId);
  const prevPomodoros = stats?.pomodoros_completed || 0;
  const prevFocusMin = stats?.total_focus_minutes || 0;

  return upsertTodayStats(userId, {
    pomodoros_completed: prevPomodoros + 1,
    total_focus_minutes: prevFocusMin + durationMinutes,
  });
}

/**
 * Auto-update daily_stats when bible chapters are read.
 */
export async function trackBibleChapter(userId: string, totalChaptersRead: number, bibleGoalChapters: number, totalPagesRead: number, totalPagesGoal: number) {
  const booksGoalMet = totalPagesRead >= totalPagesGoal;
  const bibleGoalMet = bibleGoalChapters > 0 ? totalChaptersRead >= bibleGoalChapters : true;

  return upsertTodayStats(userId, {
    bible_chapters_read: totalChaptersRead,
    goals_completed: booksGoalMet && bibleGoalMet,
  });
}

export async function getRecentDailyStats(userId: string, days = 35) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const { data } = await dataFetch({ action: "select", table: "daily_stats", filters: { eq: { user_id: userId }, gte: { date: format(start, "yyyy-MM-dd") }, order: { column: "date", ascending: false }, select: "date, goals_completed, books_pages_read, bible_chapters_read" } });
  return data || [];
}
