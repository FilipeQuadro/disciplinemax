import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface CommunityChallenge {
  id: string;
  title: string;
  description: string;
  target_type: "pomodoros" | "pages" | "bible_chapters" | "books";
  target_value: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface CommunityChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  contribution: number;
  created_at: string;
}

export class CommunityEventRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getActiveChallenges(): Promise<CommunityChallenge[]> {
    return MetricsService.measure("communityEvent_getActive", async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await this.client
        .from("community_challenges")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today);
      return (data as CommunityChallenge[]) ?? [];
    }, { table: "community_challenges" });
  }

  async getChallengeProgress(challengeId: string): Promise<{ totalContribution: number; participantCount: number }> {
    return MetricsService.measure("communityEvent_getProgress", async () => {
      const { data } = await this.client
        .from("community_challenge_progress")
        .select("contribution")
        .eq("challenge_id", challengeId);

      const rows = data as Array<{ contribution: number }> ?? [];
      return {
        totalContribution: rows.reduce((s, r) => s + r.contribution, 0),
        participantCount: rows.length,
      };
    }, { table: "community_challenge_progress" });
  }

  async contribute(challengeId: string, userId: string, amount: number): Promise<CommunityChallengeProgress | null> {
    return MetricsService.measure("communityEvent_contribute", async () => {
      // Upsert: add contribution to existing or create new
      const { data: existing } = await this.client
        .from("community_challenge_progress")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const newContribution = (existing as any).contribution + amount;
        const { data, error } = await this.client
          .from("community_challenge_progress")
          .update({ contribution: newContribution })
          .eq("challenge_id", challengeId)
          .eq("user_id", userId)
          .select()
          .maybeSingle();
        if (error) return null;
        return data as CommunityChallengeProgress;
      }

      const { data, error } = await this.client
        .from("community_challenge_progress")
        .insert({ challenge_id: challengeId, user_id: userId, contribution: amount })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as CommunityChallengeProgress;
    }, { table: "community_challenge_progress" });
  }

  async getUserContribution(challengeId: string, userId: string): Promise<number> {
    return MetricsService.measure("communityEvent_getUserContribution", async () => {
      const { data } = await this.client
        .from("community_challenge_progress")
        .select("contribution")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();
      return (data as { contribution: number } | null)?.contribution ?? 0;
    }, { table: "community_challenge_progress" });
  }
}
