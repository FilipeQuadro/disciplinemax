import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface UserProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string;
  is_public: boolean;
  referral_code: string | null;
  books_completed: number;
  total_pages: number;
  pomodoros_total: number;
  bible_chapters_total: number;
  created_at: string;
  updated_at: string;
}

export class ProfileRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    return MetricsService.measure("profile_get", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as UserProfile | null;
    }, { table: "user_profiles" });
  }

  async getByUsername(username: string): Promise<UserProfile | null> {
    return MetricsService.measure("profile_getByUsername", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("*")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();
      return data as UserProfile | null;
    }, { table: "user_profiles" });
  }

  async getByReferralCode(code: string): Promise<UserProfile | null> {
    return MetricsService.measure("profile_getByReferral", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("*")
        .eq("referral_code", code)
        .maybeSingle();
      return data as UserProfile | null;
    }, { table: "user_profiles" });
  }

  async upsertProfile(profile: Partial<UserProfile> & { user_id: string }): Promise<UserProfile | null> {
    return MetricsService.measure("profile_upsert", async () => {
      const { data, error } = await this.client
        .from("user_profiles")
        .upsert({
          ...profile,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserProfile;
    }, { table: "user_profiles" });
  }

  async updateStats(userId: string, stats: Partial<Pick<UserProfile, "books_completed" | "total_pages" | "pomodoros_total" | "bible_chapters_total">>): Promise<UserProfile | null> {
    return MetricsService.measure("profile_updateStats", async () => {
      const { data, error } = await this.client
        .from("user_profiles")
        .update({ ...stats, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select()
        .maybeSingle();
      if (error) return null;
      return data as UserProfile;
    }, { table: "user_profiles" });
  }

  async usernameExists(username: string): Promise<boolean> {
    return MetricsService.measure("profile_usernameExists", async () => {
      const { data } = await this.client
        .from("user_profiles")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();
      return !!data;
    }, { table: "user_profiles" });
  }
}
