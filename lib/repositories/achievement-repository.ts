import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  completed: boolean;
  unlocked_at: string | null;
  created_at: string;
}

export class AchievementRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getUnlocked(userId: string): Promise<UserAchievement[]> {
    return MetricsService.measure("achievements_getUnlocked", async () => {
      const { data } = await this.client
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId);
      return (data as UserAchievement[]) ?? [];
    }, { table: "user_achievements" });
  }

  async upsertAchievement(entry: { user_id: string; achievement_id: string; progress?: number; completed?: boolean; unlocked_at?: string }): Promise<UserAchievement | null> {
    return MetricsService.measure("achievements_upsert", async () => {
      const { data, error } = await this.client
        .from("user_achievements")
        .upsert(entry, { onConflict: "user_id,achievement_id" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserAchievement;
    }, { table: "user_achievements" });
  }

  async getProgress(userId: string, achievementId: string): Promise<UserAchievement | null> {
    return MetricsService.measure("achievements_getProgress", async () => {
      const { data } = await this.client
        .from("user_achievements")
        .select("*")
        .eq("user_id", userId)
        .eq("achievement_id", achievementId)
        .maybeSingle();
      return data as UserAchievement | null;
    }, { table: "user_achievements" });
  }

  async batchGetUnlocked(userIds: string[]): Promise<UserAchievement[]> {
    if (userIds.length === 0) return [];
    return MetricsService.measure("achievements_batchGet", async () => {
      const { data } = await this.client
        .from("user_achievements")
        .select("*")
        .in("user_id", userIds)
        .eq("completed", true);
      return (data as UserAchievement[]) ?? [];
    }, { table: "user_achievements" });
  }
}
