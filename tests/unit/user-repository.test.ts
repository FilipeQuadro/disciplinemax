import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

vi.mock("@/lib/cache", () => ({
  ApplicationCacheService: {
    getOrSet: (_key: string, fn: () => Promise<any>) => fn(),
    invalidateNamespace: vi.fn(),
  },
}));

import { UserRepository } from "@/lib/repositories/user-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  // Make chain thenable (awaitable)
  chain.then = (resolve: any) => resolve({ data: [], error: null, ...overrides });

  Object.assign(chain, overrides);
  return chain;
}

describe("UserRepository", () => {
  let repo: UserRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new UserRepository(client);
  });

  describe("getAllBooks", () => {
    it("returns books from database", async () => {
      const books = [{ id: "1", title: "Book 1", user_id: "u1" }];
      chain.then = (resolve: any) => resolve({ data: books, error: null });
      const result = await repo.getAllBooks();
      expect(result).toEqual(books);
    });

    it("returns empty array on error", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: { message: "DB error" } });
      const result = await repo.getAllBooks();
      expect(result).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getAllBooks();
      expect(result).toEqual([]);
    });
  });

  describe("getBooksByUserId", () => {
    it("queries books for a specific user", async () => {
      const books = [{ id: "1", title: "Book 1", user_id: "user-1" }];
      chain.then = (resolve: any) => resolve({ data: books, error: null });
      const result = await repo.getBooksByUserId("user-1");
      expect(result).toEqual(books);
      expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    });

    it("returns empty array when user has no books", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getBooksByUserId("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("resetDailyPages", () => {
    it("returns 1 on success", async () => {
      chain.then = (resolve: any) => resolve({ error: null });
      const result = await repo.resetDailyPages();
      expect(result).toBe(1);
      expect(chain.neq).toHaveBeenCalledWith("pages_read_today", 0);
    });

    it("returns 0 on error", async () => {
      chain.then = (resolve: any) => resolve({ error: { message: "fail" } });
      const result = await repo.resetDailyPages();
      expect(result).toBe(0);
    });
  });

  describe("getAllBibleGoals", () => {
    it("returns goals from database", async () => {
      const goals = [{ user_id: "u1", daily_chapters: 3 }];
      chain.then = (resolve: any) => resolve({ data: goals, error: null });
      const result = await repo.getAllBibleGoals();
      expect(result).toEqual(goals);
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getAllBibleGoals();
      expect(result).toEqual([]);
    });
  });

  describe("getBibleGoalByUserId", () => {
    it("returns goal when found", async () => {
      const goal = { user_id: "u1", daily_chapters: 3 };
      chain.maybeSingle.mockResolvedValueOnce({ data: goal, error: null });
      const result = await repo.getBibleGoalByUserId("u1");
      expect(result).toEqual(goal);
    });

    it("returns null when not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getBibleGoalByUserId("u1");
      expect(result).toBeNull();
    });
  });

  describe("getTodayStats", () => {
    it("returns stats for today", async () => {
      const stats = [{ date: "2024-01-01", user_id: "u1" }];
      chain.then = (resolve: any) => resolve({ data: stats, error: null });
      const result = await repo.getTodayStats("2024-01-01");
      expect(result).toEqual(stats);
      expect(chain.eq).toHaveBeenCalledWith("date", "2024-01-01");
    });

    it("returns empty array on null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getTodayStats("2024-01-01");
      expect(result).toEqual([]);
    });
  });

  describe("getWeeklyStats", () => {
    it("queries stats with date range", async () => {
      const stats = [{ date: "2024-01-01" }];
      chain.then = (resolve: any) => resolve({ data: stats, error: null });
      const result = await repo.getWeeklyStats("u1", "2024-01-01", "2024-01-07");
      expect(result).toEqual(stats);
      expect(chain.gte).toHaveBeenCalledWith("date", "2024-01-01");
      expect(chain.lte).toHaveBeenCalledWith("date", "2024-01-07");
    });
  });

  describe("getRecentStats", () => {
    it("queries recent stats with limit", async () => {
      const stats = [{ date: "2024-01-01" }];
      chain.then = (resolve: any) => resolve({ data: stats, error: null });
      const result = await repo.getRecentStats("u1", 15);
      expect(result).toEqual(stats);
      expect(chain.limit).toHaveBeenCalledWith(15);
    });
  });

  describe("getBibleReadingsCount", () => {
    it("returns count of readings", async () => {
      chain.then = (resolve: any) => resolve({ count: 5, error: null });
      const result = await repo.getBibleReadingsCount("u1", "2024-01-01");
      expect(result).toBe(5);
    });

    it("returns 0 when count is null", async () => {
      chain.then = (resolve: any) => resolve({ count: null, error: null });
      const result = await repo.getBibleReadingsCount("u1", "2024-01-01");
      expect(result).toBe(0);
    });
  });

  describe("getPomodoros", () => {
    it("returns completed pomodoro sessions", async () => {
      const sessions = [{ duration_minutes: 25 }];
      chain.then = (resolve: any) => resolve({ data: sessions, error: null });
      const result = await repo.getPomodoros("u1", "2024-01-01");
      expect(result).toEqual(sessions);
      expect(chain.eq).toHaveBeenCalledWith("completed", true);
    });

    it("returns empty array on null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getPomodoros("u1", "2024-01-01");
      expect(result).toEqual([]);
    });
  });

  describe("batch methods", () => {
    it("getWeeklyStatsBatch queries with date range", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getWeeklyStatsBatch("2024-01-01", "2024-01-07");
      expect(chain.gte).toHaveBeenCalledWith("date", "2024-01-01");
      expect(chain.lte).toHaveBeenCalledWith("date", "2024-01-07");
    });

    it("getRecentStatsBatch queries with limit", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getRecentStatsBatch(10);
      expect(chain.limit).toHaveBeenCalledWith(10 * 100);
    });

    it("getPomodorosBatch queries with since date", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getPomodorosBatch("2024-01-01");
      expect(chain.gte).toHaveBeenCalledWith("started_at", "2024-01-01");
    });

    it("getBibleReadingsBatch queries with since date", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getBibleReadingsBatch("2024-01-01");
      expect(chain.gte).toHaveBeenCalledWith("read_at", "2024-01-01");
    });
  });
});
