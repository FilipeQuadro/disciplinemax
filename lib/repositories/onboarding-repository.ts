import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export interface OnboardingProgress {
  user_id: string;
  step: number;
  step_data: Record<string, unknown>;
  completed: boolean;
  activation_date: string | null;
  created_at: string;
  updated_at: string;
}

export class OnboardingRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getProgress(userId: string): Promise<OnboardingProgress | null> {
    return MetricsService.measure("onboarding_getProgress", async () => {
      const { data, error } = await this.client
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        logger.error("Failed to get onboarding progress", { userId, error: error.message });
        return null;
      }
      return data as OnboardingProgress | null;
    }, { table: "onboarding_progress" });
  }

  async saveStep(userId: string, step: number, stepData: Record<string, unknown> = {}): Promise<OnboardingProgress | null> {
    return MetricsService.measure("onboarding_saveStep", async () => {
      const { data, error } = await this.client
        .from("onboarding_progress")
        .upsert({
          user_id: userId,
          step,
          step_data: stepData,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) {
        logger.error("Failed to save onboarding step", { userId, step, error: error.message });
        return null;
      }
      return data as OnboardingProgress | null;
    }, { table: "onboarding_progress" });
  }

  async completeOnboarding(userId: string): Promise<OnboardingProgress | null> {
    return MetricsService.measure("onboarding_complete", async () => {
      const { data, error } = await this.client
        .from("onboarding_progress")
        .upsert({
          user_id: userId,
          step: 4,
          completed: true,
          activation_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) {
        logger.error("Failed to complete onboarding", { userId, error: error.message });
        return null;
      }
      return data as OnboardingProgress | null;
    }, { table: "onboarding_progress" });
  }
}