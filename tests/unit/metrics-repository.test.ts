import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetricsRepository } from "@/lib/repositories/metrics-repository";
import { MetricsService } from "@/lib/metrics";

const mockInsert = vi.fn();
const mockLt = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockFrom,
  })),
}));

function setupMock() {
  const deleteChain = { lt: mockLt };
  mockFrom.mockReturnValue({
    insert: mockInsert,
    delete: () => deleteChain,
  });
  mockInsert.mockReturnValue({ error: null });
  mockLt.mockReturnValue({ count: 5, error: null });
}

describe("MetricsRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    MetricsService.reset();
  });

  describe("buildSnapshotRows", () => {
    it("builds rows from current metrics", () => {
      MetricsService.increment("test_counter", { status: "success" });
      MetricsService.setGauge("test_gauge", 42);
      MetricsService.recordDuration("test_histogram", 100);

      const repo = new MetricsRepository();
      const rows = repo.buildSnapshotRows();

      expect(rows.length).toBeGreaterThanOrEqual(3);
      expect(rows.some((r) => r.snapshot_type === "counter")).toBe(true);
      expect(rows.some((r) => r.snapshot_type === "gauge")).toBe(true);
      expect(rows.some((r) => r.snapshot_type === "histogram")).toBe(true);
    });

    it("returns minimal rows when no metrics", () => {
      const repo = new MetricsRepository();
      const rows = repo.buildSnapshotRows();
      expect(rows.length).toBeLessThanOrEqual(1);
    });
  });

  describe("saveSnapshots", () => {
    it("saves rows successfully", async () => {
      mockInsert.mockReturnValue({ error: null });
      const repo = new MetricsRepository();
      const rows = [
        { snapshot_type: "counter", metric_key: "test", metric_value: 1, captured_at: new Date().toISOString() },
      ];
      const saved = await repo.saveSnapshots(rows);
      expect(saved).toBe(1);
    });

    it("returns 0 on error", async () => {
      mockInsert.mockReturnValue({ error: { message: "DB error" } });
      const repo = new MetricsRepository();
      const rows = [
        { snapshot_type: "counter", metric_key: "test", metric_value: 1, captured_at: new Date().toISOString() },
      ];
      const saved = await repo.saveSnapshots(rows);
      expect(saved).toBe(0);
    });

    it("returns 0 for empty rows", async () => {
      const repo = new MetricsRepository();
      const saved = await repo.saveSnapshots([]);
      expect(saved).toBe(0);
    });
  });

  describe("cleanupOld", () => {
    it("deletes old metrics", async () => {
      mockLt.mockReturnValue({ count: 10, error: null });
      const repo = new MetricsRepository();
      const count = await repo.cleanupOld();
      expect(count).toBe(10);
    });

    it("returns 0 on error", async () => {
      mockLt.mockReturnValue({ count: 0, error: { message: "DB error" } });
      const repo = new MetricsRepository();
      const count = await repo.cleanupOld();
      expect(count).toBe(0);
    });
  });
});
