import { describe, it, expect, vi, beforeEach } from "vitest";

// No module mocks needed — we inject fake dependencies directly

import { OnboardingService } from "@/lib/services/onboarding-service";

function createMockRepo() {
  return {
    getProgress: vi.fn(),
    saveStep: vi.fn(),
    completeOnboarding: vi.fn(),
  } as any;
}

function createMockEventRepo() {
  return {
    track: vi.fn().mockResolvedValue(undefined),
  } as any;
}

describe("OnboardingService", () => {
  let service: OnboardingService;
  let mockRepo: ReturnType<typeof createMockRepo>;
  let mockEventRepo: ReturnType<typeof createMockEventRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepo();
    mockEventRepo = createMockEventRepo();
    service = new OnboardingService(mockRepo, mockEventRepo);
  });

  describe("getProgress", () => {
    it("delegates to repository", async () => {
      const progress = { user_id: "u1", step: 2, completed: false };
      mockRepo.getProgress.mockResolvedValueOnce(progress);
      const result = await service.getProgress("u1");
      expect(result).toEqual(progress);
      expect(mockRepo.getProgress).toHaveBeenCalledWith("u1");
    });

    it("returns null when repo returns null", async () => {
      mockRepo.getProgress.mockResolvedValueOnce(null);
      const result = await service.getProgress("u1");
      expect(result).toBeNull();
    });
  });

  describe("saveStep", () => {
    it("delegates to repository with step data", async () => {
      const saved = { user_id: "u1", step: 3, completed: false };
      mockRepo.saveStep.mockResolvedValueOnce(saved);
      const result = await service.saveStep("u1", 3, { area: "dev" });
      expect(result).toEqual(saved);
      expect(mockRepo.saveStep).toHaveBeenCalledWith("u1", 3, { area: "dev" });
    });

    it("defaults step data to empty object", async () => {
      mockRepo.saveStep.mockResolvedValueOnce(null);
      await service.saveStep("u1", 1);
      expect(mockRepo.saveStep).toHaveBeenCalledWith("u1", 1, {});
    });
  });

  describe("completeOnboarding", () => {
    it("delegates to repo and fires onboarding_completed event", async () => {
      const completed = { user_id: "u1", step: 4, completed: true };
      mockRepo.completeOnboarding.mockResolvedValueOnce(completed);
      const result = await service.completeOnboarding("u1", { area: "devocional" });
      expect(result).toEqual(completed);
      expect(mockRepo.completeOnboarding).toHaveBeenCalledWith("u1");
      expect(mockEventRepo.track).toHaveBeenCalledWith("u1", "onboarding_completed", { area: "devocional" });
    });

    it("fires event even with empty data", async () => {
      mockRepo.completeOnboarding.mockResolvedValueOnce(null);
      await service.completeOnboarding("u1");
      expect(mockEventRepo.track).toHaveBeenCalledWith("u1", "onboarding_completed", {});
    });

    it("does not block on event tracking failure", async () => {
      mockRepo.completeOnboarding.mockResolvedValueOnce({ user_id: "u1", step: 4, completed: true });
      mockEventRepo.track.mockRejectedValueOnce(new Error("event error"));
      const result = await service.completeOnboarding("u1");
      expect(result).toBeTruthy();
    });
  });
});
