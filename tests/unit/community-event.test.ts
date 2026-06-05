import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { CommunityEventService } from "@/lib/services/community-event-service";
import { CommunityEventRepository, type CommunityChallenge } from "@/lib/repositories/community-event-repository";

describe("CommunityEventService", () => {
  let service: CommunityEventService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getActiveChallenges: vi.fn().mockResolvedValue([]),
      getChallengeProgress: vi.fn().mockResolvedValue({ totalContribution: 0, participantCount: 0 }),
      contribute: vi.fn().mockResolvedValue(null),
      getUserContribution: vi.fn().mockResolvedValue(0),
    };
    service = new CommunityEventService(mockRepo);
  });

  describe("getActiveChallenges", () => {
    it("returns active challenges from repository", async () => {
      const challenges: CommunityChallenge[] = [
        { id: "c1", title: "10K Pomodoros", description: "", target_type: "pomodoros", target_value: 10000, start_date: "2024-01-01", end_date: "2024-12-31", created_at: "" },
      ];
      mockRepo.getActiveChallenges.mockResolvedValueOnce(challenges);
      const result = await service.getActiveChallenges();
      expect(result).toEqual(challenges);
    });
  });

  describe("getChallengeProgress", () => {
    it("returns progress with percentage", async () => {
      const challenges: CommunityChallenge[] = [
        { id: "c1", title: "10K Pomodoros", description: "", target_type: "pomodoros", target_value: 10000, start_date: "2024-01-01", end_date: "2024-12-31", created_at: "" },
      ];
      mockRepo.getActiveChallenges.mockResolvedValueOnce(challenges);
      mockRepo.getChallengeProgress.mockResolvedValueOnce({ totalContribution: 5000, participantCount: 100 });

      const result = await service.getChallengeProgress("c1");
      expect(result.totalContribution).toBe(5000);
      expect(result.participantCount).toBe(100);
      expect(result.targetValue).toBe(10000);
      expect(result.progressPct).toBe(50);
    });

    it("caps progress at 100%", async () => {
      const challenges: CommunityChallenge[] = [
        { id: "c1", title: "Test", description: "", target_type: "pomodoros", target_value: 100, start_date: "", end_date: "", created_at: "" },
      ];
      mockRepo.getActiveChallenges.mockResolvedValueOnce(challenges);
      mockRepo.getChallengeProgress.mockResolvedValueOnce({ totalContribution: 200, participantCount: 5 });

      const result = await service.getChallengeProgress("c1");
      expect(result.progressPct).toBe(100);
    });
  });

  describe("contribute", () => {
    it("returns false for zero or negative amount", async () => {
      expect(await service.contribute("c1", "user-1", 0)).toBe(false);
      expect(await service.contribute("c1", "user-1", -5)).toBe(false);
      expect(mockRepo.contribute).not.toHaveBeenCalled();
    });

    it("delegates to repository and returns true on success", async () => {
      mockRepo.contribute.mockResolvedValueOnce({ id: "cp1" });
      const result = await service.contribute("c1", "user-1", 10);
      expect(result).toBe(true);
      expect(mockRepo.contribute).toHaveBeenCalledWith("c1", "user-1", 10);
    });

    it("returns false on failure", async () => {
      mockRepo.contribute.mockResolvedValueOnce(null);
      const result = await service.contribute("c1", "user-1", 10);
      expect(result).toBe(false);
    });
  });

  describe("getUserContribution", () => {
    it("returns user contribution amount", async () => {
      mockRepo.getUserContribution.mockResolvedValueOnce(42);
      const result = await service.getUserContribution("c1", "user-1");
      expect(result).toBe(42);
    });
  });
});
