import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService, METRICS } from "@/lib/metrics";
import type { UserSettings } from "@/lib/supabase";

export class SettingsRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getAllSettings(): Promise<UserSettings[]> {
    return MetricsService.measure("settings_getAll", async () => {
      const { data, error } = await this.client
        .from("user_settings")
        .select("*");
      if (error) return [];
      return (data as UserSettings[]) ?? [];
    }, { table: "user_settings" });
  }

  async getSettingsByUserId(userId: string): Promise<UserSettings | null> {
    return MetricsService.measure("settings_getById", async () => {
      const { data } = await this.client
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as UserSettings | null;
    }, { table: "user_settings" });
  }
}
