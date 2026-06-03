import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export interface ProductAnalyticsSnapshot {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  active_streak_users: number;
  notifications_sent: number;
  notifications_delivered: number;
  notifications_failed: number;
  average_streak: number;
  average_daily_pages: number;
  average_daily_pomodoros: number;
  retention_7d: number;
  retention_30d: number;
  total_users: number;
  new_users_today: number;
  new_users_this_week: number;
  captured_at: string;
}

export class ProductAnalyticsRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  /**
   * Save a batch of analytics metrics.
   */
  async saveMetrics(rows: Array<{ metric_key: string; metric_value: number; dimensions?: Record<string, string> }>): Promise<number> {
    if (rows.length === 0) return 0;

    const insertRows = rows.map((r) => ({
      metric_key: r.metric_key,
      metric_value: r.metric_value,
      dimensions: r.dimensions ?? {},
      captured_at: new Date().toISOString(),
    }));

    const { error } = await this.client.from("product_analytics").insert(insertRows);

    if (error) {
      logger.error("Failed to save analytics", { error: error.message });
      return 0;
    }

    return rows.length;
  }

  /**
   * Get the latest snapshot for a given metric key.
   */
  async getLatest(metricKey: string): Promise<number> {
    const { data } = await this.client
      .from("product_analytics")
      .select("metric_value")
      .eq("metric_key", metricKey)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? Number(data.metric_value) : 0;
  }

  /**
   * Get the latest values for multiple metric keys.
   */
  async getLatestBatch(keys: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const key of keys) {
      result[key] = await this.getLatest(key);
    }
    return result;
  }

  /**
   * Get metric time series for the last N days.
   */
  async getTimeSeries(metricKey: string, days = 30): Promise<Array<{ date: string; value: number }>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.client
      .from("product_analytics")
      .select("metric_value, captured_at")
      .eq("metric_key", metricKey)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });

    if (error || !data) return [];

    return data.map((r: { metric_value: number; captured_at: string }) => ({
      date: r.captured_at.split("T")[0],
      value: Number(r.metric_value),
    }));
  }

  /**
   * Cleanup old analytics data (older than 90 days).
   */
  async cleanupOld(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await this.client
      .from("product_analytics")
      .delete({ count: "exact" })
      .lt("captured_at", ninetyDaysAgo);

    if (error) {
      logger.error("Failed to cleanup analytics", { error: error.message });
      return 0;
    }
    return count ?? 0;
  }
}

/**
 * Computes product analytics from raw database data.
 * No external deps — just queries the existing tables.
 */
export class ProductAnalyticsService {
  private client: SupabaseClient;
  private repo: ProductAnalyticsRepository;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
    this.repo = new ProductAnalyticsRepository(this.client);
  }

  /**
   * Compute and persist the full analytics snapshot.
   * Called periodically by the analytics cron or on-demand.
   */
  async computeAndSave(): Promise<ProductAnalyticsSnapshot> {
    return MetricsService.measure("analytics_compute", async () => {
      const snapshot = await this.compute();
      await this.persist(snapshot);
      return snapshot;
    });
  }

  /**
   * Compute the current analytics snapshot from raw data.
   */
  async compute(): Promise<ProductAnalyticsSnapshot> {
    const today = this.getBrtDate();
    const weekAgo = this.getBrtDate(-7);
    const monthAgo = this.getBrtDate(-30);

    const [
      dauResult,
      wauResult,
      mauResult,
      totalUsersResult,
      newTodayResult,
      newWeekResult,
      streakUsersResult,
      avgStreakResult,
      avgPagesResult,
      avgPomodorosResult,
      notifsSentResult,
      notifsDeliveredResult,
      notifsFailedResult,
      cohort7dResult,
      cohort30dResult,
    ] = await Promise.all([
      // DAU — users with daily_stats today
      this.client.from("daily_stats").select("user_id", { count: "exact", head: true }).eq("date", today),

      // WAU — users with daily_stats in the last 7 days
      this.client.from("daily_stats").select("user_id", { count: "exact", head: true }).gte("date", weekAgo),

      // MAU — users with daily_stats in the last 30 days
      this.client.from("daily_stats").select("user_id", { count: "exact", head: true }).gte("date", monthAgo),

      // Total users
      this.client.from("user_settings").select("user_id", { count: "exact", head: true }),

      // New users today
      this.client.from("user_settings").select("user_id", { count: "exact", head: true }).gte("created_at", today),

      // New users this week
      this.client.from("user_settings").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo),

      // Users with active streak (streak_day >= 3)
      this.client.from("daily_stats").select("user_id", { count: "exact", head: true }).eq("date", today).gte("streak_day", 3),

      // Average streak
      this.computeAverage("daily_stats", "streak_day", today),

      // Average daily pages
      this.computeAverage("daily_stats", "books_pages_read", today),

      // Average daily pomodoros
      this.computeAverage("daily_stats", "pomodoros_completed", today),

      // Notifications sent (from metrics_snapshots counter)
      this.getMetricCounter("notifications_sent"),

      // Notifications delivered (approximation from telegram_sent + push_sent)
      this.getMetricCounter("telegram_sent"),

      // Notifications failed
      this.getMetricCounter("notifications_failed"),

      // Retention 7d: users who registered 7+ days ago AND have stats this week
      this.computeRetention(7),

      // Retention 30d
      this.computeRetention(30),
    ]);

    const totalUsers = totalUsersResult.count ?? 0;
    const dau = dauResult.count ?? 0;
    const wau = wauResult.count ?? 0;
    const mau = mauResult.count ?? 0;
    const notifsSent = notifsSentResult;
    const notifsDelivered = notifsDeliveredResult;

    return {
      daily_active_users: dau,
      weekly_active_users: wau,
      monthly_active_users: mau,
      active_streak_users: streakUsersResult.count ?? 0,
      notifications_sent: notifsSent,
      notifications_delivered: notifsDelivered,
      notifications_failed: notifsFailedResult,
      average_streak: avgStreakResult,
      average_daily_pages: avgPagesResult,
      average_daily_pomodoros: avgPomodorosResult,
      retention_7d: cohort7dResult,
      retention_30d: cohort30dResult,
      total_users: totalUsers,
      new_users_today: newTodayResult.count ?? 0,
      new_users_this_week: newWeekResult.count ?? 0,
      captured_at: new Date().toISOString(),
    };
  }

  /**
   * Get the latest computed snapshot from the analytics table.
   */
  async getLatestSnapshot(): Promise<ProductAnalyticsSnapshot | null> {
    const keys: Array<keyof ProductAnalyticsSnapshot> = [
      "daily_active_users", "weekly_active_users", "monthly_active_users",
      "active_streak_users", "notifications_sent", "notifications_delivered",
      "notifications_failed", "average_streak", "average_daily_pages",
      "average_daily_pomodoros", "retention_7d", "retention_30d",
      "total_users", "new_users_today", "new_users_this_week",
    ];

    const values = await this.repo.getLatestBatch(keys);
    const capturedAt = new Date().toISOString();

    return {
      daily_active_users: values.daily_active_users ?? 0,
      weekly_active_users: values.weekly_active_users ?? 0,
      monthly_active_users: values.monthly_active_users ?? 0,
      active_streak_users: values.active_streak_users ?? 0,
      notifications_sent: values.notifications_sent ?? 0,
      notifications_delivered: values.notifications_delivered ?? 0,
      notifications_failed: values.notifications_failed ?? 0,
      average_streak: values.average_streak ?? 0,
      average_daily_pages: values.average_daily_pages ?? 0,
      average_daily_pomodoros: values.average_daily_pomodoros ?? 0,
      retention_7d: values.retention_7d ?? 0,
      retention_30d: values.retention_30d ?? 0,
      total_users: values.total_users ?? 0,
      new_users_today: values.new_users_today ?? 0,
      new_users_this_week: values.new_users_this_week ?? 0,
      captured_at: capturedAt,
    };
  }

  /**
   * Persist the snapshot to the analytics table.
   */
  private async persist(snapshot: ProductAnalyticsSnapshot): Promise<void> {
    const rows = [
      { metric_key: "daily_active_users", metric_value: snapshot.daily_active_users },
      { metric_key: "weekly_active_users", metric_value: snapshot.weekly_active_users },
      { metric_key: "monthly_active_users", metric_value: snapshot.monthly_active_users },
      { metric_key: "active_streak_users", metric_value: snapshot.active_streak_users },
      { metric_key: "notifications_sent", metric_value: snapshot.notifications_sent },
      { metric_key: "notifications_delivered", metric_value: snapshot.notifications_delivered },
      { metric_key: "notifications_failed", metric_value: snapshot.notifications_failed },
      { metric_key: "average_streak", metric_value: snapshot.average_streak },
      { metric_key: "average_daily_pages", metric_value: snapshot.average_daily_pages },
      { metric_key: "average_daily_pomodoros", metric_value: snapshot.average_daily_pomodoros },
      { metric_key: "retention_7d", metric_value: snapshot.retention_7d },
      { metric_key: "retention_30d", metric_value: snapshot.retention_30d },
      { metric_key: "total_users", metric_value: snapshot.total_users },
      { metric_key: "new_users_today", metric_value: snapshot.new_users_today },
      { metric_key: "new_users_this_week", metric_value: snapshot.new_users_this_week },
    ];

    const saved = await this.repo.saveMetrics(rows);
    logger.info("Product analytics snapshot saved", { metricsCount: saved });
  }

  // ── Helper methods ──────────────────────────────────────────────

  private getBrtDate(offsetDays = 0): string {
    const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  }

  private async computeAverage(table: string, column: string, date: string): Promise<number> {
    const { data } = await this.client
      .from(table)
      .select(column)
      .eq("date", date);

    if (!data || data.length === 0) return 0;

    let sum = 0;
    for (const row of data) {
      sum += Number((row as unknown as Record<string, unknown>)[column]) || 0;
    }
    return Math.round((sum / data.length) * 100) / 100;
  }

  private async getMetricCounter(metricName: string): Promise<number> {
    try {
      const { data } = await this.client
        .from("metrics_snapshots")
        .select("metric_value")
        .eq("snapshot_type", "counter")
        .like("metric_key", `${metricName}%`)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return data ? Number(data.metric_value) : MetricsService.getCounter(metricName);
    } catch {
      return MetricsService.getCounter(metricName);
    }
  }

  /**
   * Compute retention: % of users who signed up N days ago and still have activity this week.
   */
  private async computeRetention(daysAgo: number): Promise<number> {
    const cohortStart = this.getBrtDate(-daysAgo);
    const cohortEnd = this.getBrtDate(-daysAgo + 1);
    const weekAgo = this.getBrtDate(-7);

    // Count users who signed up in the cohort period
    const { count: cohortSize } = await this.client
      .from("user_settings")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", cohortStart)
      .lt("created_at", cohortEnd);

    if (!cohortSize || cohortSize === 0) return 0;

    // Count users from that cohort who have activity this week
    const { data: cohortUsers } = await this.client
      .from("user_settings")
      .select("user_id")
      .gte("created_at", cohortStart)
      .lt("created_at", cohortEnd);

    if (!cohortUsers || cohortUsers.length === 0) return 0;

    const userIds = cohortUsers.map((u: { user_id: string }) => u.user_id);
    const { count: retained } = await this.client
      .from("daily_stats")
      .select("user_id", { count: "exact", head: true })
      .in("user_id", userIds)
      .gte("date", weekAgo);

    return Math.round(((retained ?? 0) / cohortSize) * 100);
  }
}
