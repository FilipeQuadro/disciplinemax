import { logger } from "@/lib/logger";

export interface MetricEntry {
  name: string;
  value: number;
  type: "counter" | "gauge" | "histogram";
  labels: Record<string, string>;
  timestamp: string;
}

/**
 * In-process metrics service. Stores metrics in memory and exposes
 * them via /api/health?metrics=true. Periodically flushed to DB
 * for long-term retention.
 *
 * No external dependencies — just memory + structured logs.
 */
export class MetricsService {
  private static counters = new Map<string, number>();
  private static gauges = new Map<string, number>();
  private static histograms = new Map<string, number[]>();
  private static startTime = Date.now();

  // ── Counters ──────────────────────────────────────────────

  static increment(name: string, labels: Record<string, string> = {}, value = 1): void {
    const key = this.buildKey(name, labels);
    const current = this.counters.get(key) ?? 0;
    this.counters.set(key, current + value);
  }

  static getCounter(name: string, labels: Record<string, string> = {}): number {
    return this.counters.get(this.buildKey(name, labels)) ?? 0;
  }

  // ── Gauges ───────────────────────────────────────────────

  static setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.gauges.set(this.buildKey(name, labels), value);
  }

  static getGauge(name: string, labels: Record<string, string> = {}): number {
    return this.gauges.get(this.buildKey(name, labels)) ?? 0;
  }

  // ── Histograms ────────────────────────────────────────────

  static recordDuration(name: string, durationMs: number, labels: Record<string, string> = {}): void {
    const key = this.buildKey(name, labels);
    const arr = this.histograms.get(key) ?? [];
    arr.push(durationMs);
    // Keep last 1000 samples per key
    if (arr.length > 1000) arr.shift();
    this.histograms.set(key, arr);
  }

  static getDurationStats(name: string, labels: Record<string, string> = {}): {
    count: number; avg: number; min: number; max: number; p95: number;
  } {
    const key = this.buildKey(name, labels);
    const arr = this.histograms.get(key) ?? [];
    if (arr.length === 0) return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };

    const sorted = [...arr].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const p95Idx = Math.floor(sorted.length * 0.95);

    return {
      count: sorted.length,
      avg: Math.round(sum / sorted.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[p95Idx],
    };
  }

  // ── Timer helper ──────────────────────────────────────────

  /**
   * Measure the duration of an async operation.
   * Increments counter and records histogram.
   */
  static async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {}
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.increment(`${operation}_total`, { ...labels, status: "success" });
      this.recordDuration(`${operation}_duration_ms`, duration, labels);
      return result;
    } catch (e) {
      const duration = Date.now() - start;
      this.increment(`${operation}_total`, { ...labels, status: "error" });
      this.recordDuration(`${operation}_duration_ms`, duration, { ...labels, status: "error" });
      throw e;
    }
  }

  // ── Snapshot ──────────────────────────────────────────────

  static getSnapshot(): {
    uptime_ms: number;
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, ReturnType<typeof MetricsService.getDurationStats>>;
  } {
    const counters: Record<string, number> = {};
    Array.from(this.counters.entries()).forEach(([k, v]) => { counters[k] = v; });

    const gauges: Record<string, number> = {};
    Array.from(this.gauges.entries()).forEach(([k, v]) => { gauges[k] = v; });

    const histograms: Record<string, ReturnType<typeof MetricsService.getDurationStats>> = {};
    Array.from(this.histograms.keys()).forEach((k) => {
      const namePart = k.split("|")[0];
      histograms[namePart] = this.getDurationStats(namePart);
    });

    return {
      uptime_ms: Date.now() - this.startTime,
      counters,
      gauges,
      histograms,
    };
  }

  // ── Reset (for testing) ───────────────────────────────────

  static reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.startTime = Date.now();
  }

  // ── Internal ──────────────────────────────────────────────

  private static buildKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return labelStr ? `${name}|${labelStr}` : name;
  }
}

// ── Convenience metric names (constants to avoid typos) ──────
export const METRICS = {
  CRON_RUNS: "cron_runs",
  CRON_DURATION: "cron_duration_ms",
  NOTIFICATIONS_SENT: "notifications_sent",
  NOTIFICATIONS_FAILED: "notifications_failed",
  TELEGRAM_SENT: "telegram_sent",
  TELEGRAM_FAILED: "telegram_failed",
  PUSH_SENT: "push_sent",
  PUSH_FAILED: "push_failed",
  DB_QUERY_DURATION: "database_query_duration_ms",
  HEALTH_CHECKS: "health_checks",
} as const;
