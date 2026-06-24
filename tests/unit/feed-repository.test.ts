import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { FeedRepository } from "@/lib/repositories/feed-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("FeedRepository", () => {
  let repo: FeedRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new FeedRepository(client);
  });

  describe("getFriendsFeed", () => {
    it("returns empty array when friendIds is empty", async () => {
      const result = await repo.getFriendsFeed([], 30);
      expect(result).toEqual([]);
      expect(client.from).not.toHaveBeenCalled();
    });

    it("returns mapped feed events with user profile data", async () => {
      const rawData = [
        {
          id: "e1", user_id: "u2", event_type: "achievement_unlocked",
          event_data: { achievement: "first_book" }, created_at: "2024-01-01",
          user_profiles: { username: "filipe", display_name: "Filipe" },
        },
      ];
      chain.then = (resolve: any) => resolve({ data: rawData, error: null });
      const result = await repo.getFriendsFeed(["u2"], 30);
      expect(result).toEqual([
        {
          id: "e1", user_id: "u2", event_type: "achievement_unlocked",
          event_data: { achievement: "first_book" }, created_at: "2024-01-01",
          username: "filipe", display_name: "Filipe",
        },
      ]);
      expect(chain.in).toHaveBeenCalledWith("user_id", ["u2"]);
      expect(chain.limit).toHaveBeenCalledWith(30);
    });

    it("returns empty array when data is null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getFriendsFeed(["u2"], 30);
      expect(result).toEqual([]);
    });

    it("uses default limit of 30", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getFriendsFeed(["u2"]);
      expect(chain.limit).toHaveBeenCalledWith(30);
    });
  });

  describe("getUserFeed", () => {
    it("returns mapped feed events for user", async () => {
      const rawData = [
        {
          id: "e1", user_id: "u1", event_type: "streak_record",
          event_data: { streak: 7 }, created_at: "2024-01-01",
          user_profiles: { username: "me", display_name: "Me" },
        },
      ];
      chain.then = (resolve: any) => resolve({ data: rawData, error: null });
      const result = await repo.getUserFeed("u1", 20);
      expect(result).toEqual([
        {
          id: "e1", user_id: "u1", event_type: "streak_record",
          event_data: { streak: 7 }, created_at: "2024-01-01",
          username: "me", display_name: "Me",
        },
      ]);
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
      expect(chain.limit).toHaveBeenCalledWith(20);
    });

    it("returns empty array when data is null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getUserFeed("u1");
      expect(result).toEqual([]);
    });

    it("uses default limit of 20", async () => {
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      await repo.getUserFeed("u1");
      expect(chain.limit).toHaveBeenCalledWith(20);
    });
  });
});
