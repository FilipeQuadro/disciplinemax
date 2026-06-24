import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { ApplicationCacheService } from "@/lib/cache";
import type { UserSettings } from "@/lib/supabase";

export class SettingsRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getAllSettings(): Promise<UserSettings[]> {
    return ApplicationCacheService.getOrSet(
      "all",
      () => MetricsService.measure("settings_getAll", async () => {
        const { data, error } = await this.client
          .from("user_settings")
          .select("*");
        if (error) return [];
        return (data as UserSettings[]) ?? [];
      }, { table: "user_settings" }),
      "settings"
    );
  }

  async getSettingsByUserId(userId: string): Promise<UserSettings | null> {
    return ApplicationCacheService.getOrSet(
      `user:${userId}`,
      () => MetricsService.measure("settings_getById", async () => {
        const { data } = await this.client
          .from("user_settings")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        return data as UserSettings | null;
      }, { table: "user_settings" }),
      "settings",
      60_000
    );
  }
}
