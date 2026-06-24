import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

interface MetricSnapshotRow {
  snapshot_type: string;
  metric_key: string;
  metric_value: unknown;
  captured_at: string;
}

export class MetricsRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  /**
   * Persist a batch of metric snapshots to the database.
   */
  async saveSnapshots(rows: MetricSnapshotRow[]): Promise<number> {
    if (rows.length === 0) return 0;

    const { error } = await this.client
      .from("metrics_snapshots")
      .insert(rows);

    if (error) {
      logger.error("MetricsRepository: failed to save snapshots", {
        error: error.message,
        rowCount: rows.length,
      });
      return 0;
    }

    return rows.length;
  }

  /**
   * Build snapshot rows from the current MetricsService state.
   */
  buildSnapshotRows(): MetricSnapshotRow[] {
    const snapshot = MetricsService.getSnapshot();
    const now = new Date().toISOString();
    const rows: MetricSnapshotRow[] = [];

    // Counters
    for (const [key, value] of Object.entries(snapshot.counters)) {
      rows.push({
        snapshot_type: "counter",
        metric_key: key,
        metric_value: value,
        captured_at: now,
      });
    }

    // Gauges
    for (const [key, value] of Object.entries(snapshot.gauges)) {
      rows.push({
        snapshot_type: "gauge",
        metric_key: key,
        metric_value: value,
        captured_at: now,
      });
    }

    // Histograms
    for (const [key, stats] of Object.entries(snapshot.histograms)) {
      rows.push({
        snapshot_type: "histogram",
        metric_key: key,
        metric_value: stats,
        captured_at: now,
      });
    }

    return rows;
  }

  /**
   * Cleanup old metrics (older than 7 days).
   */
  async cleanupOld(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await this.client
      .from("metrics_snapshots")
      .delete({ count: "exact" })
      .lt("captured_at", sevenDaysAgo);

    if (error) {
      logger.error("MetricsRepository: failed to cleanup old metrics", { error: error.message });
      return 0;
    }

    return count ?? 0;
  }
}
