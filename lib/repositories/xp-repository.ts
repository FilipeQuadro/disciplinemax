import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserXp {
  user_id: string;
  total_xp: number;
  current_level: number;
  updated_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  xp_amount: number;
  source: string;
  source_id: string | null;
  created_at: string;
}

export class XpRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getXp(userId: string): Promise<UserXp | null> {
    return MetricsService.measure("xp_get", async () => {
      const { data } = await this.client
        .from("user_xp")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as UserXp | null;
    }, { table: "user_xp" });
  }

  async addXp(userId: string, amount: number, source: string, sourceId?: string): Promise<UserXp | null> {
    return MetricsService.measure("xp_add", async () => {
      // Insert xp_event
      await this.client.from("xp_events").insert({
        user_id: userId,
        xp_amount: amount,
        source,
        source_id: sourceId || null,
      });

      // Upsert user_xp with level computation
      const existing = await this.getXp(userId);
      const newTotalXp = (existing?.total_xp ?? 0) + amount;
      const newLevel = Math.floor(Math.sqrt(newTotalXp / 100)) + 1;

      const { data, error } = await this.client
        .from("user_xp")
        .upsert({
          user_id: userId,
          total_xp: newTotalXp,
          current_level: newLevel,
        }, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) return null;
      return data as UserXp;
    }, { table: "user_xp" });
  }

  async getXpHistory(userId: string, limit = 30): Promise<XpEvent[]> {
    return MetricsService.measure("xp_getHistory", async () => {
      const { data } = await this.client
        .from("xp_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return (data as XpEvent[]) ?? [];
    }, { table: "xp_events" });
  }

  async batchGetXp(userIds: string[]): Promise<UserXp[]> {
    if (userIds.length === 0) return [];
    return MetricsService.measure("xp_batchGet", async () => {
      const { data } = await this.client
        .from("user_xp")
        .select("*")
        .in("user_id", userIds);
      return (data as UserXp[]) ?? [];
    }, { table: "user_xp" });
  }
}
