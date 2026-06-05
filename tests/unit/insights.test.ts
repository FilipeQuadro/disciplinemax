import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }),
  })),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { InsightService } from "@/lib/services/insight-service";
import { InsightRepository } from "@/lib/repositories/insight-repository";
import { StreakRepository } from "@/lib/repositories/streak-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";

describe("InsightService", () => {
  let service: InsightService;
  let mockInsightRepo: any;
  let mockStreakRepo: any;
  let mockXpRepo: any;
  let mockAchievementRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInsightRepo = {
      getInsights: vi.fn().mockResolvedValue([]),
      addInsight: vi.fn().mockImplementation((entry: any) => Promise.resolve({ ...entry, id: "mock-id" })),
      cleanupOld: vi.fn().mockResolvedValue(undefined),
    };

    mockStreakRepo = {
      getStreak: vi.fn().mockResolvedValue(null),
    };

    mockXpRepo = {
      getXp: vi.fn().mockResolvedValue(null),
    };

    mockAchievementRepo = {
      getUnlocked: vi.fn().mockResolvedValue([]),
    };

    service = new InsightService(mockInsightRepo, mockStreakRepo, mockXpRepo, mockAchievementRepo);
  });

  describe("generateInsights", () => {
    it("generates streak risk insight when streak > 0 and not active today", async () => {
      mockStreakRepo.getStreak.mockResolvedValueOnce({
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        last_active_date: "2024-01-13",
        consistency_rate: 0.5,
        streak_freeze_count: 0,
      });

      const result = await service.generateInsights("user-1");
      const riskInsight = result.find((i: any) => i.insight_type === "streak_risk");
      expect(riskInsight).toBeTruthy();
      expect(riskInsight!.message).toContain("risco");
    });

    it("does not generate streak risk when streak is 0", async () => {
      mockStreakRepo.getStreak.mockResolvedValueOnce({
        user_id: "user-1",
        current_streak: 0,
        longest_streak: 5,
        last_active_date: "2024-01-10",
        consistency_rate: 0,
        streak_freeze_count: 0,
      });

      const result = await service.generateInsights("user-1");
      const riskInsight = result.find((i: any) => i.insight_type === "streak_risk");
      expect(riskInsight).toBeFalsy();
    });

    it("does not generate streak risk when active today", async () => {
      const today = new Date().toISOString().split("T")[0];
      mockStreakRepo.getStreak.mockResolvedValueOnce({
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        last_active_date: today,
        consistency_rate: 0.5,
        streak_freeze_count: 0,
      });

      const result = await service.generateInsights("user-1");
      const riskInsight = result.find((i: any) => i.insight_type === "streak_risk");
      expect(riskInsight).toBeFalsy();
    });

    it("persists generated insights via repository", async () => {
      mockStreakRepo.getStreak.mockResolvedValueOnce({
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        last_active_date: "2024-01-13",
        consistency_rate: 0.5,
        streak_freeze_count: 0,
      });

      const result = await service.generateInsights("user-1");
      // At minimum, streak_risk should be generated and persisted
      expect(mockInsightRepo.addInsight).toHaveBeenCalled();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getInsights", () => {
    it("delegates to repository with limit", async () => {
      await service.getInsights("user-1", 5);
      expect(mockInsightRepo.getInsights).toHaveBeenCalledWith("user-1", 5);
    });
  });
});
