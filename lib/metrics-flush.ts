import { MetricsRepository } from "@/lib/repositories/metrics-repository";
import { logger } from "@/lib/logger";
import { MetricsService } from "@/lib/metrics";

const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Periodically flushes in-memory metrics to the database.
 * Starts automatically — call start() once at app boot.
 * Safe to call multiple times (idempotent).
 */
export class MetricsFlushService {
  private static intervalId: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;

  /**
   * Start the periodic flush.
   */
  static start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.intervalId = setInterval(() => {
      this.flush().catch((e: unknown) => {
        logger.error("MetricsFlushService: unhandled error in flush", { error: String(e) });
      });
    }, FLUSH_INTERVAL_MS);

    // Don't prevent process exit
    if (this.intervalId && typeof this.intervalId === "object" && "unref" in this.intervalId) {
      (this.intervalId as NodeJS.Timeout).unref();
    }

    logger.info("MetricsFlushService started", { intervalMs: FLUSH_INTERVAL_MS });
  }

  /**
   * Stop the periodic flush.
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Manually flush current metrics to database.
   */
  static async flush(): Promise<{ saved: number }> {
    const repo = new MetricsRepository();
    const rows = repo.buildSnapshotRows();

    if (rows.length === 0) {
      return { saved: 0 };
    }

    const start = Date.now();
    const saved = await repo.saveSnapshots(rows);
    const duration = Date.now() - start;

    MetricsService.increment("metrics_flush_total", { status: saved > 0 ? "success" : "error" });
    MetricsService.recordDuration("metrics_flush_duration_ms", duration);

    logger.info("MetricsFlushService: flush complete", {
      saved,
      totalRows: rows.length,
      duration_ms: duration,
    });

    return { saved };
  }
}
