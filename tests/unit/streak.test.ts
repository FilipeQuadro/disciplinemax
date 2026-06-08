import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { streak_freeze_available: 0, streak_freeze_used: 0 } }),
    })),
  })),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

vi.mock("@/lib/repositories/settings-repository", () => ({
  SettingsRepository: vi.fn().mockImplementation(() => ({
    getSettingsByUserId: vi.fn().mockResolvedValue({
      streak_freeze_available: 0,
      streak_freeze_used: 0,
    }),
  })),
}));

vi.mock("@/lib/repositories/event-tracking-repository", () => ({
  EventTrackingService: vi.fn().mockImplementation(() => ({
    track: vi.fn().mockResolvedValue(undefined),
  })),
  EVENT_TYPES: {
    STREAK_EXTENDED: "streak_extended",
    STREAK_BROKEN: "streak_broken",
  },
}));

import { StreakService } from "@/lib/services/streak-service";
import { StreakRepository } from "@/lib/repositories/streak-repository";

function createMockChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: [], error: null, ...overrides });
  return chain;
}

describe("StreakService", () => {
  let service: StreakService;
  let mockStreakRepo: any;
  let mockEventService: any;
  let mockSettingsRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStreakRepo = {
      getStreak: vi.fn().mockResolvedValue(null),
      upsertStreak: vi.fn().mockResolvedValue(null),
      incrementStreak: vi.fn().mockResolvedValue(null),
      breakStreak: vi.fn().mockResolvedValue(null),
      useFreeze: vi.fn().mockResolvedValue(null),
    };

    mockEventService = {
      track: vi.fn().mockResolvedValue(undefined),
    };

    mockSettingsRepo = {
      getSettingsByUserId: vi.fn().mockResolvedValue({
        streak_freeze_available: 0,
        streak_freeze_used: 0,
      }),
    };

    service = new StreakService(mockStreakRepo, mockEventService, mockSettingsRepo);
  });

  describe("recordActivity", () => {
    it("creates new streak when no existing streak", async () => {
      const newStreak = {
        user_id: "user-1",
        current_streak: 1,
        longest_streak: 1,
        weekly_streak: 1,
        monthly_streak: 1,
        last_active_date: "2024-01-15",
        streak_freeze_count: 0,
        consistency_rate: 0,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.incrementStreak.mockResolvedValueOnce(newStreak);

      const result = await service.recordActivity("user-1", "2024-01-15");
      expect(result).toEqual(newStreak);
      expect(mockStreakRepo.incrementStreak).toHaveBeenCalledWith("user-1");
    });

    it("does not increment if already active today", async () => {
      const existing = {
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 5,
        weekly_streak: 5,
        monthly_streak: 5,
        last_active_date: "2024-01-15",
        streak_freeze_count: 0,
        consistency_rate: 0.5,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(existing);

      const result = await service.recordActivity("user-1", "2024-01-15");
      expect(result).toEqual(existing);
      expect(mockStreakRepo.incrementStreak).not.toHaveBeenCalled();
    });

    it("tracks STREAK_EXTENDED event on increment", async () => {
      const newStreak = {
        user_id: "user-1",
        current_streak: 2,
        longest_streak: 2,
        weekly_streak: 2,
        monthly_streak: 2,
        last_active_date: "2024-01-15",
        streak_freeze_count: 0,
        consistency_rate: 0.1,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.incrementStreak.mockResolvedValueOnce(newStreak);

      await service.recordActivity("user-1", "2024-01-15");
      expect(mockEventService.track).toHaveBeenCalledWith("user-1", "streak_extended", expect.objectContaining({
        streak: 2,
      }));
    });
  });

  describe("validateStreak", () => {
    it("returns null when no existing streak", async () => {
      mockStreakRepo.getStreak.mockResolvedValueOnce(null);
      const result = await service.validateStreak("user-1", "2024-01-15");
      expect(result).toBeNull();
    });

    it("does not break streak if last active today", async () => {
      const today = new Date().toISOString().split("T")[0];
      const existing = {
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        weekly_streak: 5,
        monthly_streak: 20,
        last_active_date: today,
        streak_freeze_count: 0,
        consistency_rate: 0.7,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(existing);

      const result = await service.validateStreak("user-1", today);
      expect(mockStreakRepo.breakStreak).not.toHaveBeenCalled();
    });

    it("does not break streak if last active yesterday", async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const existing = {
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        weekly_streak: 5,
        monthly_streak: 20,
        last_active_date: yesterday,
        streak_freeze_count: 0,
        consistency_rate: 0.7,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(existing);

      const result = await service.validateStreak("user-1", today);
      expect(mockStreakRepo.breakStreak).not.toHaveBeenCalled();
    });

    it("breaks streak if last active 2+ days ago and no freeze", async () => {
      const today = new Date().toISOString().split("T")[0];
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];

      const existing = {
        user_id: "user-1",
        current_streak: 5,
        longest_streak: 10,
        weekly_streak: 5,
        monthly_streak: 20,
        last_active_date: twoDaysAgo,
        streak_freeze_count: 0,
        consistency_rate: 0.7,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(existing);
      mockStreakRepo.breakStreak.mockResolvedValueOnce({ ...existing, current_streak: 0 });
      mockStreakRepo.getStreak.mockResolvedValueOnce({ ...existing, current_streak: 0 });

      await service.validateStreak("user-1", today);
      expect(mockStreakRepo.breakStreak).toHaveBeenCalledWith("user-1");
    });

    it("does not break streak with 0 current_streak", async () => {
      const existing = {
        user_id: "user-1",
        current_streak: 0,
        longest_streak: 10,
        weekly_streak: 0,
        monthly_streak: 0,
        last_active_date: "2024-01-12",
        streak_freeze_count: 0,
        consistency_rate: 0,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(existing);

      const result = await service.validateStreak("user-1", "2024-01-15");
      expect(mockStreakRepo.breakStreak).not.toHaveBeenCalled();
    });
  });

  describe("getStreak", () => {
    it("delegates to repository", async () => {
      const streak = {
        user_id: "user-1",
        current_streak: 3,
        longest_streak: 3,
        weekly_streak: 3,
        monthly_streak: 3,
        last_active_date: "2024-01-15",
        streak_freeze_count: 0,
        consistency_rate: 0.5,
        updated_at: new Date().toISOString(),
      };
      mockStreakRepo.getStreak.mockResolvedValueOnce(streak);

      const result = await service.getStreak("user-1");
      expect(result).toEqual(streak);
    });
  });
});
