import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  target: number;
  completed: boolean;
  completed_at: string | null;
  xp_reward: number;
  week_key: string;
  created_at: string;
}

export class ChallengeRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getActive(userId: string): Promise<UserChallenge[]> {
    return MetricsService.measure("challenges_getActive", async () => {
      const { data } = await this.client
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", false);
      return (data as UserChallenge[]) ?? [];
    }, { table: "user_challenges" });
  }

  async upsertChallenge(entry: { user_id: string; challenge_id: string; target: number; xp_reward: number; week_key: string }): Promise<UserChallenge | null> {
    return MetricsService.measure("challenges_upsert", async () => {
      const { data, error } = await this.client
        .from("user_challenges")
        .upsert(entry, { onConflict: "user_id,challenge_id,week_key" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserChallenge;
    }, { table: "user_challenges" });
  }

  async updateProgress(userId: string, challengeId: string, weekKey: string, progress: number, completed: boolean): Promise<UserChallenge | null> {
    return MetricsService.measure("challenges_updateProgress", async () => {
      const updates: Record<string, unknown> = { progress };
      if (completed) {
        updates.completed = true;
        updates.completed_at = new Date().toISOString();
      }
      const { data, error } = await this.client
        .from("user_challenges")
        .update(updates)
        .eq("user_id", userId)
        .eq("challenge_id", challengeId)
        .eq("week_key", weekKey)
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserChallenge;
    }, { table: "user_challenges" });
  }

  async getCompleted(userId: string, limit = 30): Promise<UserChallenge[]> {
    return MetricsService.measure("challenges_getCompleted", async () => {
      const { data } = await this.client
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(limit);
      return (data as UserChallenge[]) ?? [];
    }, { table: "user_challenges" });
  }
}
