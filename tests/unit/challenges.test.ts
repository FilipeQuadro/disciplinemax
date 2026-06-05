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

import { ChallengeService, CHALLENGES } from "@/lib/services/challenge-service";
import type { ChallengeState } from "@/lib/services/challenge-service";

describe("ChallengeService", () => {
  let service: ChallengeService;
  let mockRepo: any;
  let mockXpRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getActive: vi.fn().mockResolvedValue([]),
      upsertChallenge: vi.fn().mockResolvedValue(null),
      updateProgress: vi.fn().mockResolvedValue(null),
      getCompleted: vi.fn().mockResolvedValue([]),
    };
    mockXpRepo = {
      addXp: vi.fn().mockResolvedValue(null),
    };
    service = new ChallengeService(mockRepo, mockXpRepo);
  });

  describe("CHALLENGES constant", () => {
    it("has 12 challenges", () => {
      expect(CHALLENGES).toHaveLength(12);
    });

    it("each has unique id", () => {
      const ids = CHALLENGES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("each has required fields", () => {
      for (const ch of CHALLENGES) {
        expect(ch.id).toBeTruthy();
        expect(ch.label).toBeTruthy();
        expect(ch.target).toBeGreaterThan(0);
        expect(ch.xpReward).toBeGreaterThan(0);
        expect(typeof ch.trackProgress).toBe("function");
      }
    });
  });

  describe("getWeekKey", () => {
    it("returns format YYYY-Www", () => {
      const key = ChallengeService.getWeekKey(new Date(2024, 0, 15)); // Jan 15, 2024
      expect(key).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe("assignWeekly", () => {
    it("assigns 3 challenges per week", async () => {
      mockRepo.upsertChallenge.mockImplementation((entry: any) => Promise.resolve(entry));
      const result = await service.assignWeekly("user-1");
      expect(result).toHaveLength(3);
      expect(mockRepo.upsertChallenge).toHaveBeenCalledTimes(3);
    });

    it("rotates challenges by week number", async () => {
      mockRepo.upsertChallenge.mockImplementation((entry: any) => Promise.resolve(entry));
      const result = await service.assignWeekly("user-1");
      // Verify different challenge_ids
      const ids = result.map((c: any) => c.challenge_id);
      expect(new Set(ids).size).toBe(3); // All unique
    });
  });

  describe("checkProgress", () => {
    it("updates progress for active challenges", async () => {
      const activeChallenge = {
        id: "mock-id",
        user_id: "user-1",
        challenge_id: "pomo_10",
        progress: 0,
        target: 10,
        completed: false,
        xp_reward: 25,
        week_key: ChallengeService.getWeekKey(),
      };
      mockRepo.getActive.mockResolvedValueOnce([activeChallenge]);
      mockRepo.updateProgress.mockResolvedValueOnce({ ...activeChallenge, progress: 7 });

      const state: ChallengeState = {
        streak: 0,
        pomodorosThisWeek: 7,
        pagesThisWeek: 0,
        bibleChaptersThisWeek: 0,
        goalsCompletedThisWeek: 0,
        booksCompletedThisWeek: 0,
      };

      const result = await service.checkProgress("user-1", state);
      expect(result).toHaveLength(1);
      expect(mockRepo.updateProgress).toHaveBeenCalledWith(
        "user-1", "pomo_10", activeChallenge.week_key, 7, false
      );
    });

    it("awards XP on challenge completion", async () => {
      const activeChallenge = {
        id: "mock-id",
        user_id: "user-1",
        challenge_id: "pomo_5",
        progress: 3,
        target: 5,
        completed: false,
        xp_reward: 15,
        week_key: ChallengeService.getWeekKey(),
      };
      mockRepo.getActive.mockResolvedValueOnce([activeChallenge]);
      mockRepo.updateProgress.mockResolvedValueOnce({ ...activeChallenge, progress: 5, completed: true });

      const state: ChallengeState = {
        streak: 0,
        pomodorosThisWeek: 5,
        pagesThisWeek: 0,
        bibleChaptersThisWeek: 0,
        goalsCompletedThisWeek: 0,
        booksCompletedThisWeek: 0,
      };

      await service.checkProgress("user-1", state);
      expect(mockXpRepo.addXp).toHaveBeenCalledWith("user-1", 15, "CHALLENGE_COMPLETED", "pomo_5");
    });
  });

  describe("trackProgress", () => {
    it("streak_7 tracks streak correctly", () => {
      const ch = CHALLENGES.find((c) => c.id === "streak_7")!;
      const state: ChallengeState = {
        streak: 5, pomodorosThisWeek: 0, pagesThisWeek: 0,
        bibleChaptersThisWeek: 0, goalsCompletedThisWeek: 0, booksCompletedThisWeek: 0,
      };
      expect(ch.trackProgress(state)).toBe(5);
    });

    it("pages_50 tracks pages correctly", () => {
      const ch = CHALLENGES.find((c) => c.id === "pages_50")!;
      const state: ChallengeState = {
        streak: 0, pomodorosThisWeek: 0, pagesThisWeek: 30,
        bibleChaptersThisWeek: 0, goalsCompletedThisWeek: 0, booksCompletedThisWeek: 0,
      };
      expect(ch.trackProgress(state)).toBe(30);
    });
  });
});
