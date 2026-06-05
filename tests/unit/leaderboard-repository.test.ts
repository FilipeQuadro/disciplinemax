import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { LeaderboardRepository } from "@/lib/repositories/leaderboard-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("LeaderboardRepository", () => {
  let repo: LeaderboardRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new LeaderboardRepository(client);
  });

  describe("getXpLeaderboard", () => {
    it("returns ranked entries with user profile data", async () => {
      const data = [
        { user_id: "u1", total_xp: 500, user_profiles: { username: "alice", display_name: "Alice" } },
        { user_id: "u2", total_xp: 300, user_profiles: { username: "bob", display_name: "Bob" } },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getXpLeaderboard(25);
      expect(result).toEqual([
        { user_id: "u1", username: "alice", display_name: "Alice", value: 500, rank: 1 },
        { user_id: "u2", username: "bob", display_name: "Bob", value: 300, rank: 2 },
      ]);
      expect(client.from).toHaveBeenCalledWith("user_xp");
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getXpLeaderboard();
      expect(result).toEqual([]);
    });

    it("respects custom limit", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getXpLeaderboard(10);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });

  describe("getStreakLeaderboard", () => {
    it("returns ranked streak entries", async () => {
      const data = [
        { user_id: "u1", current_streak: 15, user_profiles: { username: "alice", display_name: "Alice" } },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getStreakLeaderboard(25);
      expect(result).toEqual([
        { user_id: "u1", username: "alice", display_name: "Alice", value: 15, rank: 1 },
      ]);
      expect(chain.gt).toHaveBeenCalledWith("current_streak", 0);
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getStreakLeaderboard();
      expect(result).toEqual([]);
    });
  });

  describe("getPomodoroLeaderboard", () => {
    it("returns ranked pomodoro entries from user_profiles", async () => {
      const data = [
        { user_id: "u1", pomodoros_total: 50, username: "alice", display_name: "Alice" },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getPomodoroLeaderboard(25);
      expect(result).toEqual([
        { user_id: "u1", username: "alice", display_name: "Alice", value: 50, rank: 1 },
      ]);
      expect(chain.gt).toHaveBeenCalledWith("pomodoros_total", 0);
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getPomodoroLeaderboard();
      expect(result).toEqual([]);
    });
  });

  describe("getPagesLeaderboard", () => {
    it("returns ranked pages entries from user_profiles", async () => {
      const data = [
        { user_id: "u1", total_pages: 200, username: "alice", display_name: "Alice" },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getPagesLeaderboard(25);
      expect(result).toEqual([
        { user_id: "u1", username: "alice", display_name: "Alice", value: 200, rank: 1 },
      ]);
      expect(chain.gt).toHaveBeenCalledWith("total_pages", 0);
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getPagesLeaderboard();
      expect(result).toEqual([]);
    });
  });
});
