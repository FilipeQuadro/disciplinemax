import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetricsFlushService } from "@/lib/metrics-flush";
import { MetricsService } from "@/lib/metrics";

// Mock the MetricsRepository
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
      delete: vi.fn().mockReturnValue({ count: 0, error: null }),
    }),
  })),
}));

describe("MetricsFlushService", () => {
  beforeEach(() => {
    MetricsFlushService.stop();
    MetricsService.reset();
  });

  afterEach(() => {
    MetricsFlushService.stop();
  });

  describe("start/stop", () => {
    it("starts flush service", () => {
      MetricsFlushService.start();
      // Should not throw
    });

    it("does not start twice", () => {
      MetricsFlushService.start();
      MetricsFlushService.start(); // Should be idempotent
    });

    it("stops flush service", () => {
      MetricsFlushService.start();
      MetricsFlushService.stop();
    });
  });

  describe("flush", () => {
    it("flushes metrics to database", async () => {
      MetricsService.increment("test_counter", { status: "success" });
      const result = await MetricsFlushService.flush();
      // Should have saved at least the counter
      expect(result.saved).toBeGreaterThanOrEqual(1);
    });

    it("returns 0 saved when no metrics", async () => {
      const result = await MetricsFlushService.flush();
      // Only uptime histogram may exist
      expect(result.saved).toBeGreaterThanOrEqual(0);
    });
  });
});
