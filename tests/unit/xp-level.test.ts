import { describe, it, expect, vi, beforeEach } from "vitest";

import { LevelService, XP_REWARDS } from "@/lib/services/level-service";
import type { XpRepository, UserXp } from "@/lib/repositories/xp-repository";

describe("LevelService", () => {
  describe("computeLevel", () => {
    it("returns level 1 for 0 XP", () => {
      expect(LevelService.computeLevel(0)).toBe(1);
    });

    it("returns level 1 for 99 XP", () => {
      expect(LevelService.computeLevel(99)).toBe(1);
    });

    it("returns level 2 for 100 XP", () => {
      expect(LevelService.computeLevel(100)).toBe(2);
    });

    it("returns level 3 for 400 XP", () => {
      expect(LevelService.computeLevel(400)).toBe(3);
    });

    it("returns level 4 for 900 XP", () => {
      expect(LevelService.computeLevel(900)).toBe(4);
    });

    it("returns level 5 for 1600 XP", () => {
      expect(LevelService.computeLevel(1600)).toBe(5);
    });

    it("returns level 11 for 10000 XP", () => {
      expect(LevelService.computeLevel(10000)).toBe(11);
    });
  });

  describe("xpForLevel", () => {
    it("level 1 starts at 0 XP", () => {
      expect(LevelService.xpForLevel(1)).toBe(0);
    });

    it("level 2 starts at 100 XP", () => {
      expect(LevelService.xpForLevel(2)).toBe(100);
    });

    it("level 3 starts at 400 XP", () => {
      expect(LevelService.xpForLevel(3)).toBe(400);
    });

    it("level 5 starts at 1600 XP", () => {
      expect(LevelService.xpForLevel(5)).toBe(1600);
    });
  });

  describe("xpToNextLevel", () => {
    it("returns xp needed to reach next level from 0", () => {
      expect(LevelService.xpToNextLevel(0)).toBe(100);
    });

    it("returns xp needed from 100 XP", () => {
      expect(LevelService.xpToNextLevel(100)).toBe(300);
    });

    it("decreases as XP increases within a level", () => {
      const at0 = LevelService.xpToNextLevel(0);
      const at50 = LevelService.xpToNextLevel(50);
      expect(at50).toBeLessThan(at0);
    });
  });

  describe("levelProgress", () => {
    it("returns 0 for 0 XP", () => {
      expect(LevelService.levelProgress(0)).toBe(0);
    });

    it("returns 50 for mid-level XP (250 = halfway to level 3)", () => {
      expect(LevelService.levelProgress(250)).toBe(50);
    });

    it("clamps to 0 minimum", () => {
      expect(LevelService.levelProgress(0)).toBe(0);
    });

    it("clamps to 100 maximum", () => {
      expect(LevelService.levelProgress(999999)).toBeLessThanOrEqual(100);
    });
  });

  describe("XP_REWARDS", () => {
    it("has all expected reward types", () => {
      expect(XP_REWARDS.POMODORO_COMPLETED).toBe(10);
      expect(XP_REWARDS.PAGE_READ).toBe(2);
      expect(XP_REWARDS.BIBLE_CHAPTER).toBe(5);
      expect(XP_REWARDS.GOAL_COMPLETED).toBe(25);
      expect(XP_REWARDS.STREAK_DAY).toBe(5);
      expect(XP_REWARDS.ACHIEVEMENT_UNLOCKED).toBe(50);
      expect(XP_REWARDS.CHALLENGE_COMPLETED).toBe(30);
      expect(XP_REWARDS.BOOK_FINISHED).toBe(100);
    });

    it("has logical progression", () => {
      expect(XP_REWARDS.PAGE_READ).toBeLessThan(XP_REWARDS.POMODORO_COMPLETED);
      expect(XP_REWARDS.POMODORO_COMPLETED).toBeLessThan(XP_REWARDS.GOAL_COMPLETED);
      expect(XP_REWARDS.GOAL_COMPLETED).toBeLessThan(XP_REWARDS.ACHIEVEMENT_UNLOCKED);
      expect(XP_REWARDS.ACHIEVEMENT_UNLOCKED).toBeLessThan(XP_REWARDS.BOOK_FINISHED);
    });
  });

  describe("instance methods", () => {
    let service: LevelService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockRepo: any;

    beforeEach(() => {
      mockRepo = {
        addXp: vi.fn(),
        getXp: vi.fn(),
        getXpHistory: vi.fn(),
        batchGetXp: vi.fn(),
      };
      service = new LevelService(mockRepo);
    });

    it("rewardPomodoro adds correct XP", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 10, current_level: 1, updated_at: "" });
      const result = await service.rewardPomodoro("u1");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 10, "POMODORO_COMPLETED", undefined);
      expect(result).toBeTruthy();
    });

    it("rewardPages adds correct XP based on page count", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 20, current_level: 1, updated_at: "" });
      const result = await service.rewardPages("u1", 10);
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 20, "PAGE_READ", undefined);
      expect(result).toBeTruthy();
    });

    it("rewardBibleChapter adds correct XP", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 5, current_level: 1, updated_at: "" });
      await service.rewardBibleChapter("u1");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 5, "BIBLE_CHAPTER", undefined);
    });

    it("rewardGoalCompleted adds correct XP", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 25, current_level: 1, updated_at: "" });
      await service.rewardGoalCompleted("u1");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 25, "GOAL_COMPLETED", undefined);
    });

    it("rewardStreakDay adds correct XP", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 5, current_level: 1, updated_at: "" });
      await service.rewardStreakDay("u1");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 5, "STREAK_DAY", undefined);
    });

    it("rewardAchievement adds correct XP with source ID", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 50, current_level: 1, updated_at: "" });
      await service.rewardAchievement("u1", "streak_7");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 50, "ACHIEVEMENT_UNLOCKED", "streak_7");
    });

    it("rewardChallenge adds correct XP with source ID", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 30, current_level: 1, updated_at: "" });
      await service.rewardChallenge("u1", "pomo_10");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 30, "CHALLENGE_COMPLETED", "pomo_10");
    });

    it("rewardBookFinished adds correct XP with source ID", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 100, current_level: 2, updated_at: "" });
      await service.rewardBookFinished("u1", "book-1");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 100, "BOOK_FINISHED", "book-1");
    });

    it("getXp delegates to repository", async () => {
      const mockXp: UserXp = { user_id: "u1", total_xp: 500, current_level: 3, updated_at: "" };
      mockRepo.getXp.mockResolvedValue(mockXp);
      const result = await service.getXp("u1");
      expect(result).toEqual(mockXp);
    });

    it("getXpHistory delegates to repository", async () => {
      mockRepo.getXpHistory.mockResolvedValue([]);
      const result = await service.getXpHistory("u1", 10);
      expect(mockRepo.getXpHistory).toHaveBeenCalledWith("u1", 10);
    });

    it("addXp delegates to repository", async () => {
      mockRepo.addXp.mockResolvedValue({ user_id: "u1", total_xp: 50, current_level: 1, updated_at: "" });
      await service.addXp("u1", 50, "PAGE_READ");
      expect(mockRepo.addXp).toHaveBeenCalledWith("u1", 50, "PAGE_READ", undefined);
    });
  });
});
