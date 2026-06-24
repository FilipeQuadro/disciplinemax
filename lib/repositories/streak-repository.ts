import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  weekly_streak: number;
  monthly_streak: number;
  streak_freeze_count: number;
  last_active_date: string | null;
  consistency_rate: number;
  updated_at: string;
}

export class StreakRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getStreak(userId: string): Promise<UserStreak | null> {
    return MetricsService.measure("streak_get", async () => {
      const { data } = await this.client
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as UserStreak | null;
    }, { table: "user_streaks" });
  }

  async upsertStreak(streak: Partial<UserStreak> & { user_id: string }): Promise<UserStreak | null> {
    return MetricsService.measure("streak_upsert", async () => {
      const { data, error } = await this.client
        .from("user_streaks")
        .upsert(streak, { onConflict: "user_id" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserStreak;
    }, { table: "user_streaks" });
  }

  async incrementStreak(userId: string): Promise<UserStreak | null> {
    const existing = await this.getStreak(userId);
    const today = new Date().toISOString().split("T")[0];

    if (!existing) {
      return this.upsertStreak({
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        weekly_streak: 1,
        monthly_streak: 1,
        last_active_date: today,
      });
    }

    // Already active today — no increment
    if (existing.last_active_date === today) return existing;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const isConsecutive = existing.last_active_date === yesterday;
    const newStreak = isConsecutive ? existing.current_streak + 1 : 1;
    const newLongest = Math.max(existing.longest_streak, newStreak);

    // Weekly streak: count consecutive days in current week
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: weekStats } = await this.client
      .from("daily_stats")
      .select("date, goals_completed")
      .eq("user_id", userId)
      .gte("date", weekAgo)
      .order("date", { ascending: false });

    const weeklyStreak = (weekStats || []).filter((s: any) => s.goals_completed).length;

    // Monthly streak: count consecutive days in current month
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data: monthStats } = await this.client
      .from("daily_stats")
      .select("date, goals_completed")
      .eq("user_id", userId)
      .gte("date", monthAgo)
      .order("date", { ascending: false });

    const monthlyStreak = (monthStats || []).filter((s: any) => s.goals_completed).length;

    // Consistency rate: last 30 days
    const consistencyRate = monthStats ? Math.round((monthlyStreak / 30) * 100) / 100 : 0;

    return this.upsertStreak({
      user_id: userId,
      current_streak: newStreak,
      longest_streak: newLongest,
      weekly_streak: weeklyStreak,
      monthly_streak: monthlyStreak,
      last_active_date: today,
      consistency_rate: consistencyRate,
    });
  }

  async breakStreak(userId: string): Promise<UserStreak | null> {
    return this.upsertStreak({
      user_id: userId,
      current_streak: 0,
    });
  }

  async useFreeze(userId: string): Promise<UserStreak | null> {
    const existing = await this.getStreak(userId);
    if (!existing) return null;
    return this.upsertStreak({
      user_id: userId,
      streak_freeze_count: existing.streak_freeze_count + 1,
      // Keep current_streak — freeze prevents the break
    });
  }

  async batchGetStreaks(userIds: string[]): Promise<UserStreak[]> {
    if (userIds.length === 0) return [];
    return MetricsService.measure("streak_batchGet", async () => {
      const { data } = await this.client
        .from("user_streaks")
        .select("*")
        .in("user_id", userIds);
      return (data as UserStreak[]) ?? [];
    }, { table: "user_streaks" });
  }
}
