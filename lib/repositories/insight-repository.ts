import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserInsight {
  id: string;
  user_id: string;
  insight_type: string;
  message: string;
  data: Record<string, unknown>;
  created_at: string;
}

export class InsightRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getInsights(userId: string, limit = 10): Promise<UserInsight[]> {
    return MetricsService.measure("insights_get", async () => {
      const { data } = await this.client
        .from("user_insights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as UserInsight[]) ?? [];
    }, { table: "user_insights" });
  }

  async addInsight(entry: { user_id: string; insight_type: string; message: string; data?: Record<string, unknown> }): Promise<UserInsight | null> {
    return MetricsService.measure("insights_add", async () => {
      const { data, error } = await this.client
        .from("user_insights")
        .insert({ ...entry, data: entry.data ?? {} })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserInsight;
    }, { table: "user_insights" });
  }

  async cleanupOld(olderThanDays = 30): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
    await this.client
      .from("user_insights")
      .delete()
      .lt("created_at", cutoff);
  }

  /**
   * Get completed pomodoro sessions for a user in the last N days.
   */
  async getCompletedPomodoros(userId: string, days = 30, limit = 100): Promise<Array<{ started_at: string }>> {
    return MetricsService.measure("insights_getPomodoros", async () => {
      const { data } = await this.client
        .from("pomodoro_sessions")
        .select("started_at")
        .eq("user_id", userId)
        .eq("completed", true)
        .gte("started_at", new Date(Date.now() - days * 86400000).toISOString())
        .limit(limit);
      return (data as Array<{ started_at: string }>) ?? [];
    }, { table: "pomodoro_sessions" });
  }

  /**
   * Get daily stats for a user in a date range.
   */
  async getDailyStatsInRange(userId: string, sinceDate: string, untilDate?: string): Promise<Array<{ goals_completed: number | boolean }>> {
    return MetricsService.measure("insights_getDailyStats", async () => {
      let query = this.client
        .from("daily_stats")
        .select("goals_completed")
        .eq("user_id", userId)
        .gte("date", sinceDate);

      if (untilDate) {
        query = query.lt("date", untilDate);
      }

      const { data } = await query;
      return (data as Array<{ goals_completed: number | boolean }>) ?? [];
    }, { table: "daily_stats" });
  }
}
