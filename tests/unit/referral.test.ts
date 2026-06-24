import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { ReferralService, REFERRAL_XP_BONUS, REFERRAL_ACHIEVEMENT_ID } from "@/lib/services/referral-service";
import { ReferralRepository, type Referral } from "@/lib/repositories/referral-repository";
import { ProfileRepository } from "@/lib/repositories/profile-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";

describe("ReferralService", () => {
  let service: ReferralService;
  let mockReferralRepo: any;
  let mockProfileRepo: any;
  let mockXpRepo: any;
  let mockAchievementRepo: any;
  let mockEventService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReferralRepo = {
      createReferral: vi.fn().mockResolvedValue(null),
      getReferralsByReferrer: vi.fn().mockResolvedValue([]),
      getReferralByInvitee: vi.fn().mockResolvedValue(null),
      getReferralCount: vi.fn().mockResolvedValue(0),
    };
    mockProfileRepo = {
      getProfile: vi.fn().mockResolvedValue(null),
      getByReferralCode: vi.fn().mockResolvedValue(null),
    };
    mockXpRepo = {
      addXp: vi.fn().mockResolvedValue(null),
    };
    mockAchievementRepo = {
      upsertAchievement: vi.fn().mockResolvedValue(null),
    };
    mockEventService = {
      track: vi.fn().mockResolvedValue(undefined),
    };
    service = new ReferralService(
      mockReferralRepo, mockProfileRepo, mockXpRepo, mockAchievementRepo, mockEventService
    );
  });

  describe("constants", () => {
    it("has correct referral XP bonus", () => {
      expect(REFERRAL_XP_BONUS).toBe(100);
    });

    it("has correct achievement ID", () => {
      expect(REFERRAL_ACHIEVEMENT_ID).toBe("referral_first");
    });
  });

  describe("getReferralCode", () => {
    it("returns the referral code from profile", async () => {
      mockProfileRepo.getProfile.mockResolvedValueOnce({
        user_id: "user-1", referral_code: "ABC123",
      });
      const code = await service.getReferralCode("user-1");
      expect(code).toBe("ABC123");
    });

    it("returns null when no profile", async () => {
      mockProfileRepo.getProfile.mockResolvedValueOnce(null);
      const code = await service.getReferralCode("user-1");
      expect(code).toBeNull();
    });
  });

  describe("trackReferral", () => {
    it("returns null for invalid code", async () => {
      mockProfileRepo.getByReferralCode.mockResolvedValueOnce(null);
      const result = await service.trackReferral("invitee-1", "INVALID");
      expect(result).toBeNull();
    });

    it("returns null when referrer is same as invitee", async () => {
      mockProfileRepo.getByReferralCode.mockResolvedValueOnce({
        user_id: "user-1", referral_code: "CODE1",
      });
      const result = await service.trackReferral("user-1", "CODE1");
      expect(result).toBeNull();
    });

    it("returns null for duplicate referral", async () => {
      mockProfileRepo.getByReferralCode.mockResolvedValueOnce({
        user_id: "referrer-1", referral_code: "CODE1",
      });
      mockReferralRepo.getReferralByInvitee.mockResolvedValueOnce({
        id: "existing", invitee_id: "invitee-1",
      });
      const result = await service.trackReferral("invitee-1", "CODE1");
      expect(result).toBeNull();
    });

    it("creates referral and awards XP and achievement", async () => {
      const referrerProfile = { user_id: "referrer-1", referral_code: "CODE1" };
      mockProfileRepo.getByReferralCode.mockResolvedValueOnce(referrerProfile);
      const referral: Referral = {
        id: "r-1", referrer_id: "referrer-1", invitee_id: "invitee-1",
        referral_code: "CODE1", created_at: "",
      };
      mockReferralRepo.createReferral.mockResolvedValueOnce(referral);

      const result = await service.trackReferral("invitee-1", "CODE1");
      expect(result).toEqual(referral);

      // XP should be awarded to both referrer and invitee
      expect(mockXpRepo.addXp).toHaveBeenCalledTimes(2);
      expect(mockXpRepo.addXp).toHaveBeenCalledWith(
        "referrer-1", REFERRAL_XP_BONUS, "ACHIEVEMENT_UNLOCKED", REFERRAL_ACHIEVEMENT_ID
      );
      expect(mockXpRepo.addXp).toHaveBeenCalledWith(
        "invitee-1", REFERRAL_XP_BONUS, "ACHIEVEMENT_UNLOCKED", "referral_joined"
      );

      // Achievement should be unlocked for referrer
      expect(mockAchievementRepo.upsertAchievement).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "referrer-1",
          achievement_id: REFERRAL_ACHIEVEMENT_ID,
          completed: true,
        })
      );

      // Events should be tracked
      expect(mockEventService.track).toHaveBeenCalledTimes(2);
    });
  });

  describe("getReferralCount", () => {
    it("returns count from repository", async () => {
      mockReferralRepo.getReferralCount.mockResolvedValueOnce(3);
      const count = await service.getReferralCount("user-1");
      expect(count).toBe(3);
    });
  });

  describe("getReferrals", () => {
    it("returns referrals from repository", async () => {
      const referrals = [{ id: "r-1" }, { id: "r-2" }];
      mockReferralRepo.getReferralsByReferrer.mockResolvedValueOnce(referrals);
      const result = await service.getReferrals("user-1");
      expect(result).toEqual(referrals);
    });
  });
});
