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

import { AchievementService, ACHIEVEMENTS } from "@/lib/services/achievement-service";
import type { AchievementState } from "@/lib/services/achievement-service";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";

describe("AchievementService", () => {
  let service: AchievementService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getUnlocked: vi.fn().mockResolvedValue([]),
      upsertAchievement: vi.fn().mockResolvedValue(null),
      getProgress: vi.fn().mockResolvedValue(null),
    };
    service = new AchievementService(mockRepo);
  });

  describe("ACHIEVEMENTS constant", () => {
    it("has exactly 10 achievements", () => {
      expect(ACHIEVEMENTS).toHaveLength(10);
    });

    it("each has unique id", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("each has required fields", () => {
      for (const ach of ACHIEVEMENTS) {
        expect(ach.id).toBeTruthy();
        expect(ach.label).toBeTruthy();
        expect(ach.description).toBeTruthy();
        expect(ach.category).toBeTruthy();
        expect(typeof ach.condition).toBe("function");
        expect(typeof ach.progress).toBe("function");
      }
    });
  });

  describe("checkAndUnlock", () => {
    const fullState: AchievementState = {
      streak: 30,
      longestStreak: 30,
      booksCompleted: 3,
      totalPagesRead: 500,
      bibleChaptersTotal: 100,
      pomodorosTotal: 150,
      totalXp: 2000,
      challengesCompleted: 5,
    };

    it("unlocks achievements matching conditions", async () => {
      mockRepo.upsertAchievement.mockImplementation((entry: any) => Promise.resolve(entry));
      const result = await service.checkAndUnlock("user-1", fullState);
      // Should unlock: streak_3, streak_7, streak_30, book_first, book_complete, bible_first, bible_50, pomo_first, pomo_100, xp_1000
      expect(result.length).toBeGreaterThan(0);
    });

    it("does not unlock achievements that don't match", async () => {
      const emptyState: AchievementState = {
        streak: 0,
        longestStreak: 0,
        booksCompleted: 0,
        totalPagesRead: 0,
        bibleChaptersTotal: 0,
        pomodorosTotal: 0,
        totalXp: 0,
        challengesCompleted: 0,
      };
      const result = await service.checkAndUnlock("user-1", emptyState);
      expect(result).toHaveLength(0);
    });

    it("skips already unlocked achievements", async () => {
      mockRepo.getUnlocked.mockResolvedValueOnce(
        ACHIEVEMENTS.map((a) => ({
          id: "mock-id",
          user_id: "user-1",
          achievement_id: a.id,
          progress: 100,
          completed: true,
          unlocked_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }))
      );
      const result = await service.checkAndUnlock("user-1", fullState);
      expect(result).toHaveLength(0);
    });

    it("unlocks streak_3 when streak >= 3", async () => {
      mockRepo.upsertAchievement.mockImplementation((entry: any) => Promise.resolve(entry));
      const state = { ...fullState, streak: 3 };
      const result = await service.checkAndUnlock("user-1", state);
      expect(result).toContain("streak_3");
    });

    it("unlocks pomo_first when pomodorosTotal >= 1", async () => {
      mockRepo.upsertAchievement.mockImplementation((entry: any) => Promise.resolve(entry));
      const state = { ...fullState, pomodorosTotal: 1, streak: 0, bibleChaptersTotal: 0, totalPagesRead: 0, booksCompleted: 0, totalXp: 0, longestStreak: 0, challengesCompleted: 0 };
      const result = await service.checkAndUnlock("user-1", state);
      expect(result).toContain("pomo_first");
    });
  });

  describe("progress calculation", () => {
    it("streak_3 progress is 66% when streak is 2", () => {
      const ach = ACHIEVEMENTS.find((a) => a.id === "streak_3")!;
      const state: AchievementState = {
        streak: 2, longestStreak: 2, booksCompleted: 0,
        totalPagesRead: 0, bibleChaptersTotal: 0, pomodorosTotal: 0,
        totalXp: 0, challengesCompleted: 0,
      };
      expect(ach.progress(state)).toBeCloseTo(66.67, 0);
    });

    it("pomo_100 progress is 50% when pomodorosTotal is 50", () => {
      const ach = ACHIEVEMENTS.find((a) => a.id === "pomo_100")!;
      const state: AchievementState = {
        streak: 0, longestStreak: 0, booksCompleted: 0,
        totalPagesRead: 0, bibleChaptersTotal: 0, pomodorosTotal: 50,
        totalXp: 0, challengesCompleted: 0,
      };
      expect(ach.progress(state)).toBe(50);
    });
  });

  describe("getDefinitions", () => {
    it("returns all achievement definitions", () => {
      const defs = service.getDefinitions();
      expect(defs).toHaveLength(10);
    });
  });
});
