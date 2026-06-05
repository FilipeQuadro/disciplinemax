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
}
