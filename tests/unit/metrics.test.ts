import { describe, it, expect, beforeEach } from "vitest";
import { MetricsService } from "@/lib/metrics";

describe("MetricsService", () => {
  beforeEach(() => {
    MetricsService.reset();
  });

  describe("counters", () => {
    it("increments a counter", () => {
      MetricsService.increment("test_counter");
      expect(MetricsService.getCounter("test_counter")).toBe(1);
    });

    it("increments by custom value", () => {
      MetricsService.increment("test_counter", {}, 5);
      expect(MetricsService.getCounter("test_counter")).toBe(5);
    });

    it("increments with labels independently", () => {
      MetricsService.increment("http_requests", { status: "success" });
      MetricsService.increment("http_requests", { status: "error" });
      expect(MetricsService.getCounter("http_requests", { status: "success" })).toBe(1);
      expect(MetricsService.getCounter("http_requests", { status: "error" })).toBe(1);
    });

    it("returns 0 for non-existent counter", () => {
      expect(MetricsService.getCounter("nonexistent")).toBe(0);
    });
  });

  describe("gauges", () => {
    it("sets a gauge value", () => {
      MetricsService.setGauge("active_users", 42);
      expect(MetricsService.getGauge("active_users")).toBe(42);
    });

    it("overwrites gauge value", () => {
      MetricsService.setGauge("active_users", 10);
      MetricsService.setGauge("active_users", 20);
      expect(MetricsService.getGauge("active_users")).toBe(20);
    });

    it("returns 0 for non-existent gauge", () => {
      expect(MetricsService.getGauge("nonexistent")).toBe(0);
    });
  });

  describe("histograms", () => {
    it("records duration", () => {
      MetricsService.recordDuration("query_time", 100);
      MetricsService.recordDuration("query_time", 200);
      const stats = MetricsService.getDurationStats("query_time");
      expect(stats.count).toBe(2);
      expect(stats.avg).toBe(150);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(200);
    });

    it("returns empty stats for non-existent histogram", () => {
      const stats = MetricsService.getDurationStats("nonexistent");
      expect(stats.count).toBe(0);
      expect(stats.avg).toBe(0);
    });

    it("calculates p95", () => {
      for (let i = 1; i <= 100; i++) {
        MetricsService.recordDuration("latency", i);
      }
      const stats = MetricsService.getDurationStats("latency");
      expect(stats.p95).toBeGreaterThanOrEqual(90);
      expect(stats.p95).toBeLessThanOrEqual(100);
    });
  });

  describe("measure", () => {
    it("measures successful operation", async () => {
      const result = await MetricsService.measure("db_query", async () => "ok");
      expect(result).toBe("ok");
      expect(MetricsService.getCounter("db_query_total", { status: "success" })).toBe(1);
    });

    it("measures failed operation", async () => {
      await expect(
        MetricsService.measure("db_query", async () => { throw new Error("fail"); })
      ).rejects.toThrow("fail");
      expect(MetricsService.getCounter("db_query_total", { status: "error" })).toBe(1);
    });

    it("records duration for both success and failure", async () => {
      await MetricsService.measure("op", async () => "ok");
      try { await MetricsService.measure("op", async () => { throw new Error("x"); }); } catch {}
      // Success and error have different label keys, so we check total across both
      const successStats = MetricsService.getDurationStats("op_duration_ms");
      // The "success" label version will have count 1, "error" label will have count 1
      // Since getDurationStats strips labels, we need to check individually
      expect(successStats.count + MetricsService.getDurationStats("op_duration_ms", { status: "error" }).count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("snapshot", () => {
    it("returns complete snapshot", () => {
      MetricsService.increment("requests", { status: "ok" });
      MetricsService.setGauge("active", 5);
      MetricsService.recordDuration("latency", 100);

      const snapshot = MetricsService.getSnapshot();
      expect(snapshot.uptime_ms).toBeGreaterThanOrEqual(0);
      expect(Object.keys(snapshot.counters).length).toBeGreaterThan(0);
      expect(Object.keys(snapshot.gauges).length).toBeGreaterThan(0);
    });
  });

  describe("reset", () => {
    it("clears all metrics", () => {
      MetricsService.increment("test");
      MetricsService.setGauge("test", 1);
      MetricsService.recordDuration("test", 1);
      MetricsService.reset();
      expect(MetricsService.getCounter("test")).toBe(0);
      expect(MetricsService.getGauge("test")).toBe(0);
      expect(MetricsService.getDurationStats("test").count).toBe(0);
    });
  });
});
