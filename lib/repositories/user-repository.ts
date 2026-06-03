import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService, METRICS } from "@/lib/metrics";
import type { Book, BibleGoal, DailyStats, PomodoroSession } from "@/lib/supabase";

export class UserRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getAllBooks(): Promise<Book[]> {
    return MetricsService.measure("user_getAllBooks", async () => {
      const { data, error } = await this.client.from("books").select("*");
      if (error) return [];
      return (data as Book[]) ?? [];
    }, { table: "books" });
  }

  async getBooksByUserId(userId: string): Promise<Book[]> {
    return MetricsService.measure("user_getBooksById", async () => {
      const { data } = await this.client
        .from("books")
        .select("*")
        .eq("user_id", userId);
      return (data as Book[]) ?? [];
    }, { table: "books" });
  }

  async resetDailyPages(): Promise<number> {
    return MetricsService.measure("user_resetDailyPages", async () => {
      const { error } = await this.client
        .from("books")
        .update({ pages_read_today: 0 })
        .neq("pages_read_today", 0);
      return error ? 0 : 1;
    }, { table: "books" });
  }

  async getAllBibleGoals(): Promise<BibleGoal[]> {
    return MetricsService.measure("user_getAllGoals", async () => {
      const { data } = await this.client.from("bible_goals").select("*");
      return (data as BibleGoal[]) ?? [];
    }, { table: "bible_goals" });
  }

  async getBibleGoalByUserId(userId: string): Promise<BibleGoal | null> {
    return MetricsService.measure("user_getGoalById", async () => {
      const { data } = await this.client
        .from("bible_goals")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as BibleGoal | null;
    }, { table: "bible_goals" });
  }

  async getTodayStats(today: string): Promise<DailyStats[]> {
    return MetricsService.measure("user_getTodayStats", async () => {
      const { data } = await this.client
        .from("daily_stats")
        .select("*")
        .eq("date", today);
      return (data as DailyStats[]) ?? [];
    }, { table: "daily_stats" });
  }

  async getWeeklyStats(userId: string, fromDate: string, toDate: string): Promise<DailyStats[]> {
    return MetricsService.measure("user_getWeeklyStats", async () => {
      const { data } = await this.client
        .from("daily_stats")
        .select("*")
        .eq("user_id", userId)
        .gte("date", fromDate)
        .lte("date", toDate);
      return (data as DailyStats[]) ?? [];
    }, { table: "daily_stats" });
  }

  async getRecentStats(userId: string, limit = 30): Promise<DailyStats[]> {
    return MetricsService.measure("user_getRecentStats", async () => {
      const { data } = await this.client
        .from("daily_stats")
        .select("date, goals_completed")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(limit);
      return (data as DailyStats[]) ?? [];
    }, { table: "daily_stats" });
  }

  async getBibleReadingsCount(userId: string, since: string): Promise<number> {
    return MetricsService.measure("user_getReadingsCount", async () => {
      const { count } = await this.client
        .from("bible_readings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("read_at", since);
      return count ?? 0;
    }, { table: "bible_readings" });
  }

  async getPomodoros(userId: string, since: string): Promise<PomodoroSession[]> {
    return MetricsService.measure("user_getPomodoros", async () => {
      const { data } = await this.client
        .from("pomodoro_sessions")
        .select("duration_minutes")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("started_at", since);
      return (data as PomodoroSession[]) ?? [];
    }, { table: "pomodoro_sessions" });
  }

  // ── Batch methods ──────────────────────────────────────────

  async getWeeklyStatsBatch(fromDate: string, toDate: string): Promise<DailyStats[]> {
    return MetricsService.measure("user_getWeeklyStatsBatch", async () => {
      const { data } = await this.client
        .from("daily_stats")
        .select("*")
        .gte("date", fromDate)
        .lte("date", toDate);
      return (data as DailyStats[]) ?? [];
    }, { table: "daily_stats" });
  }

  async getRecentStatsBatch(limit = 30): Promise<DailyStats[]> {
    return MetricsService.measure("user_getRecentStatsBatch", async () => {
      const { data } = await this.client
        .from("daily_stats")
        .select("user_id, date, goals_completed")
        .order("date", { ascending: false })
        .limit(limit * 100);
      return (data as DailyStats[]) ?? [];
    }, { table: "daily_stats" });
  }

  async getPomodorosBatch(since: string): Promise<PomodoroSession[]> {
    return MetricsService.measure("user_getPomodorosBatch", async () => {
      const { data } = await this.client
        .from("pomodoro_sessions")
        .select("user_id, duration_minutes")
        .eq("completed", true)
        .gte("started_at", since);
      return (data as PomodoroSession[]) ?? [];
    }, { table: "pomodoro_sessions" });
  }

  async getBibleReadingsBatch(since: string): Promise<Array<{ user_id: string; id: string }>> {
    return MetricsService.measure("user_getReadingsBatch", async () => {
      const { data } = await this.client
        .from("bible_readings")
        .select("user_id, id")
        .gte("read_at", since);
      return (data as Array<{ user_id: string; id: string }>) ?? [];
    }, { table: "bible_readings" });
  }
}
