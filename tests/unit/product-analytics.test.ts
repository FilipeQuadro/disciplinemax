import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProductAnalyticsRepository, ProductAnalyticsService } from "@/lib/repositories/product-analytics-repository";

// Mock Supabase client
const mockFrom = vi.fn();

vi.mock("@/lib/db-client", () => ({
  getServiceClient: () => ({ from: mockFrom }),
}));

function createChain(finalResult: any) {
  const chain: any = {};
  const methods = ["select", "insert", "delete", "update", "eq", "gte", "lt", "lte", "in", "like", "order", "limit", "maybeSingle"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // Override the terminal method
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  chain.select = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("ProductAnalyticsRepository", () => {
  let repo: ProductAnalyticsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ProductAnalyticsRepository({ from: mockFrom } as any);
  });

  describe("saveMetrics", () => {
    it("should insert analytics rows", async () => {
      const chain = createChain({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await repo.saveMetrics([
        { metric_key: "dau", metric_value: 42 },
        { metric_key: "wau", metric_value: 100 },
      ]);

      expect(result).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith("product_analytics");
    });

    it("should return 0 on error", async () => {
      const chain = createChain({ error: null });
      chain.insert = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
      mockFrom.mockReturnValue(chain);

      const result = await repo.saveMetrics([{ metric_key: "dau", metric_value: 42 }]);
      expect(result).toBe(0);
    });

    it("should return 0 for empty input", async () => {
      const result = await repo.saveMetrics([]);
      expect(result).toBe(0);
    });
  });

  describe("getLatest", () => {
    it("should return latest value for a metric", async () => {
      const chain = createChain({ data: { metric_value: 42 }, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await repo.getLatest("dau");
      expect(result).toBe(42);
    });

    it("should return 0 when no data found", async () => {
      const chain = createChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await repo.getLatest("nonexistent");
      expect(result).toBe(0);
    });
  });
});

describe("ProductAnalyticsService", () => {
  let service: ProductAnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ProductAnalyticsService({ from: mockFrom } as any);
  });

  describe("compute", () => {
    it("should compute full analytics snapshot", async () => {
      // Mock all the parallel queries
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        const chain: any = {};
        const methods = ["select", "insert", "delete", "update", "eq", "gte", "lt", "lte", "in", "like", "order", "limit", "maybeSingle"];
        methods.forEach((m) => {
          chain[m] = vi.fn().mockReturnValue(chain);
        });
        // Terminal method returns different results based on call order
        chain.select = vi.fn().mockReturnValue(chain);
        // Most calls are count queries
        if (callCount <= 7) {
          // DAU, WAU, MAU, total, new today, new week, streak users
          chain.eq = vi.fn().mockReturnValue(chain);
          chain.gte = vi.fn().mockReturnValue(chain);
          chain.head = true;
          // Simulate .select returning a promise with count
          const resolved = { count: callCount * 10, error: null };
          return new Proxy(chain, {
            get(target, prop) {
              if (prop === "then" || prop === "catch") {
                return (resolve: any) => Promise.resolve(resolved).then(resolve);
              }
              return target[prop];
            }
          });
        }
        // avg queries
        if (callCount === 8 || callCount === 9 || callCount === 10) {
          chain.eq = vi.fn().mockReturnValue(chain);
          return new Proxy(chain, {
            get(target, prop) {
              if (prop === "then" || prop === "catch") {
                return (resolve: any) => Promise.resolve({
                  data: [{ streak_day: 5 }, { streak_day: 3 }],
                  error: null
                }).then(resolve);
              }
              return target[prop];
            }
          });
        }
        return chain;
      });

      // This test validates the structure — full integration test would need a real DB
      const snapshot = await service.compute();

      expect(snapshot).toHaveProperty("daily_active_users");
      expect(snapshot).toHaveProperty("weekly_active_users");
      expect(snapshot).toHaveProperty("monthly_active_users");
      expect(snapshot).toHaveProperty("active_streak_users");
      expect(snapshot).toHaveProperty("average_streak");
      expect(snapshot).toHaveProperty("retention_7d");
      expect(snapshot).toHaveProperty("retention_30d");
      expect(snapshot).toHaveProperty("total_users");
      expect(snapshot).toHaveProperty("captured_at");
    });
  });
});
