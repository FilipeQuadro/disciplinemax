import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface DashboardData {
  books: Array<Record<string, unknown>>;
  bibleGoal: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  todayStats: Record<string, unknown> | null;
  bibleTodayCount: number;
  streak: number;
  weekStats: Array<{
    day: string;
    date: string;
    is_today: boolean;
    pages: number;
    chapters: number;
    pomodoros: number;
  }>;
  calendarData: Array<{
    date: string;
    done: boolean;
    partial: boolean;
  }>;
  xp: { total_xp: number; current_level: number } | null;
  challenges: Array<Record<string, unknown>>;
  insights: Array<Record<string, unknown>>;
  achievements: Array<Record<string, unknown>>;
}

export class DashboardRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getDashboardData(userId: string): Promise<DashboardData | null> {
    return MetricsService.measure("dashboard_rpc", async () => {
      const { data, error } = await this.client.rpc("get_dashboard_data", {
        p_user_id: userId,
      });

      if (error) {
        MetricsService.increment("dashboard_rpc_error", { error: error.message.substring(0, 50) });
        return null;
      }

      return data as DashboardData;
    }, { table: "rpc:get_dashboard_data" }).catch(() => null);
  }
}
