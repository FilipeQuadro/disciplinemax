import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { CommunityEventRepository, type CommunityChallenge, type CommunityChallengeProgress } from "@/lib/repositories/community-event-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("CommunityEventRepository", () => {
  let repo: CommunityEventRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new CommunityEventRepository(client);
  });

  describe("getActiveChallenges", () => {
    it("returns active challenges within date range", async () => {
      const challenges: CommunityChallenge[] = [
        {
          id: "c1", title: "10K Pomodoros", description: "Community goal",
          target_type: "pomodoros", target_value: 10000,
          start_date: "2024-01-01", end_date: "2024-12-31", created_at: "",
        },
      ];
      chain.then = (resolve: any) => resolve({ data: challenges, error: null });
      const result = await repo.getActiveChallenges();
      expect(result).toEqual(challenges);
      expect(chain.lte).toHaveBeenCalledWith("start_date", expect.any(String));
      expect(chain.gte).toHaveBeenCalledWith("end_date", expect.any(String));
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getActiveChallenges();
      expect(result).toEqual([]);
    });
  });

  describe("getChallengeProgress", () => {
    it("returns total contribution and participant count", async () => {
      const rows = [{ contribution: 50 }, { contribution: 30 }];
      chain.then = (resolve: any) => resolve({ data: rows, error: null });
      const result = await repo.getChallengeProgress("c1");
      expect(result).toEqual({ totalContribution: 80, participantCount: 2 });
    });

    it("returns zero values when no progress", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getChallengeProgress("c1");
      expect(result).toEqual({ totalContribution: 0, participantCount: 0 });
    });
  });

  describe("contribute", () => {
    it("updates existing contribution when user already contributed", async () => {
      // First call: select existing
      chain.maybeSingle.mockResolvedValueOnce({ data: { contribution: 5 }, error: null });
      // Second call: update
      const updated: CommunityChallengeProgress = {
        id: "cp1", challenge_id: "c1", user_id: "u1", contribution: 10, created_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: updated, error: null });

      const result = await repo.contribute("c1", "u1", 5);
      expect(result).toEqual(updated);
      expect(chain.update).toHaveBeenCalledWith({ contribution: 10 });
    });

    it("inserts new contribution when user has not contributed", async () => {
      // First call: select existing — no existing record
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      // Second call: insert
      const inserted: CommunityChallengeProgress = {
        id: "cp1", challenge_id: "c1", user_id: "u1", contribution: 5, created_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: inserted, error: null });

      const result = await repo.contribute("c1", "u1", 5);
      expect(result).toEqual(inserted);
      expect(chain.insert).toHaveBeenCalledWith({
        challenge_id: "c1", user_id: "u1", contribution: 5,
      });
    });

    it("returns null on update error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: { contribution: 5 }, error: null });
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.contribute("c1", "u1", 5);
      expect(result).toBeNull();
    });

    it("returns null on insert error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.contribute("c1", "u1", 5);
      expect(result).toBeNull();
    });
  });

  describe("getUserContribution", () => {
    it("returns user contribution amount", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: { contribution: 25 }, error: null });
      const result = await repo.getUserContribution("c1", "u1");
      expect(result).toBe(25);
    });

    it("returns 0 when user has not contributed", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getUserContribution("c1", "u1");
      expect(result).toBe(0);
    });
  });
});
