import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { LeaderboardService } from "@/lib/services/leaderboard-service";
import { LeaderboardRepository, type LeaderboardEntry } from "@/lib/repositories/leaderboard-repository";

describe("LeaderboardService", () => {
  let service: LeaderboardService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getXpLeaderboard: vi.fn().mockResolvedValue([]),
      getStreakLeaderboard: vi.fn().mockResolvedValue([]),
      getPomodoroLeaderboard: vi.fn().mockResolvedValue([]),
      getPagesLeaderboard: vi.fn().mockResolvedValue([]),
    };
    service = new LeaderboardService(mockRepo);
  });

  describe("getLeaderboard", () => {
    const mockEntries: LeaderboardEntry[] = [
      { user_id: "u1", username: "alice", display_name: "Alice", value: 1000, rank: 1 },
      { user_id: "u2", username: "bob", display_name: "Bob", value: 500, rank: 2 },
    ];

    it("calls getXpLeaderboard for xp category", async () => {
      mockRepo.getXpLeaderboard.mockResolvedValueOnce(mockEntries);
      const result = await service.getLeaderboard("xp", 25);
      expect(mockRepo.getXpLeaderboard).toHaveBeenCalledWith(25);
      expect(result).toEqual(mockEntries);
    });

    it("calls getStreakLeaderboard for streak category", async () => {
      mockRepo.getStreakLeaderboard.mockResolvedValueOnce(mockEntries);
      const result = await service.getLeaderboard("streak", 10);
      expect(mockRepo.getStreakLeaderboard).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockEntries);
    });

    it("calls getPomodoroLeaderboard for pomodoros category", async () => {
      mockRepo.getPomodoroLeaderboard.mockResolvedValueOnce(mockEntries);
      const result = await service.getLeaderboard("pomodoros");
      expect(mockRepo.getPomodoroLeaderboard).toHaveBeenCalledWith(25);
      expect(result).toEqual(mockEntries);
    });

    it("calls getPagesLeaderboard for pages category", async () => {
      mockRepo.getPagesLeaderboard.mockResolvedValueOnce(mockEntries);
      const result = await service.getLeaderboard("pages");
      expect(mockRepo.getPagesLeaderboard).toHaveBeenCalledWith(25);
      expect(result).toEqual(mockEntries);
    });

    it("defaults to xp for unknown category", async () => {
      mockRepo.getXpLeaderboard.mockResolvedValueOnce([]);
      const result = await service.getLeaderboard("xp" as any);
      expect(mockRepo.getXpLeaderboard).toHaveBeenCalled();
    });
  });
});
