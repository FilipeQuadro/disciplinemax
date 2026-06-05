import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  display_name: string | null;
  value: number;
  rank: number;
}

export class LeaderboardRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getXpLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    return MetricsService.measure("leaderboard_xp", async () => {
      const { data } = await this.client
        .from("user_xp")
        .select("user_id, total_xp, user_profiles(username, display_name)")
        .order("total_xp", { ascending: false })
        .limit(limit);

      return ((data as any[]) ?? []).map((d, i) => ({
        user_id: d.user_id,
        username: d.user_profiles?.username,
        display_name: d.user_profiles?.display_name,
        value: d.total_xp,
        rank: i + 1,
      }));
    }, { table: "user_xp" });
  }

  async getStreakLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    return MetricsService.measure("leaderboard_streak", async () => {
      const { data } = await this.client
        .from("user_streaks")
        .select("user_id, current_streak, user_profiles(username, display_name)")
        .gt("current_streak", 0)
        .order("current_streak", { ascending: false })
        .limit(limit);

      return ((data as any[]) ?? []).map((d, i) => ({
        user_id: d.user_id,
        username: d.user_profiles?.username,
        display_name: d.user_profiles?.display_name,
        value: d.current_streak,
        rank: i + 1,
      }));
    }, { table: "user_streaks" });
  }

  async getPomodoroLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    return MetricsService.measure("leaderboard_pomodoro", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("user_id, pomodoros_total, username, display_name")
        .gt("pomodoros_total", 0)
        .order("pomodoros_total", { ascending: false })
        .limit(limit);

      return ((data as any[]) ?? []).map((d, i) => ({
        user_id: d.user_id,
        username: d.username,
        display_name: d.display_name,
        value: d.pomodoros_total,
        rank: i + 1,
      }));
    }, { table: "user_profiles" });
  }

  async getPagesLeaderboard(limit = 25): Promise<LeaderboardEntry[]> {
    return MetricsService.measure("leaderboard_pages", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("user_id, total_pages, username, display_name")
        .gt("total_pages", 0)
        .order("total_pages", { ascending: false })
        .limit(limit);

      return ((data as any[]) ?? []).map((d, i) => ({
        user_id: d.user_id,
        username: d.username,
        display_name: d.display_name,
        value: d.total_pages,
        rank: i + 1,
      }));
    }, { table: "user_profiles" });
  }
}
