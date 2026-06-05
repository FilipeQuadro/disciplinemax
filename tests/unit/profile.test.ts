import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { ProfileService } from "@/lib/services/profile-service";
import { ProfileRepository, type UserProfile } from "@/lib/repositories/profile-repository";

describe("ProfileService", () => {
  let service: ProfileService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getProfile: vi.fn().mockResolvedValue(null),
      getByUsername: vi.fn().mockResolvedValue(null),
      getByReferralCode: vi.fn().mockResolvedValue(null),
      upsertProfile: vi.fn().mockResolvedValue(null),
      updateStats: vi.fn().mockResolvedValue(null),
      usernameExists: vi.fn().mockResolvedValue(false),
    };
    service = new ProfileService(mockRepo);
  });

  describe("getProfile", () => {
    it("returns profile from repository", async () => {
      const profile: UserProfile = {
        user_id: "user-1", username: "filipe", display_name: "Filipe", bio: "",
        is_public: true, referral_code: "ABC123", books_completed: 0, total_pages: 0,
        pomodoros_total: 0, bible_chapters_total: 0, created_at: "", updated_at: "",
      };
      mockRepo.getProfile.mockResolvedValueOnce(profile);
      const result = await service.getProfile("user-1");
      expect(result).toEqual(profile);
      expect(mockRepo.getProfile).toHaveBeenCalledWith("user-1");
    });

    it("returns null when profile not found", async () => {
      mockRepo.getProfile.mockResolvedValueOnce(null);
      const result = await service.getProfile("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getPublicProfile", () => {
    it("delegates to repository getByUsername", async () => {
      mockRepo.getByUsername.mockResolvedValueOnce({ user_id: "user-1", username: "filipe" });
      const result = await service.getPublicProfile("filipe");
      expect(mockRepo.getByUsername).toHaveBeenCalledWith("filipe");
      expect(result).toBeTruthy();
    });
  });

  describe("upsertProfile", () => {
    it("normalizes username to lowercase alphanumeric", async () => {
      mockRepo.upsertProfile.mockImplementation((p: any) => Promise.resolve(p));
      mockRepo.usernameExists.mockResolvedValueOnce(false);

      await service.upsertProfile("user-1", { username: "Filipe_2026!!!" });
      expect(mockRepo.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: "filipe_2026" })
      );
    });

    it("rejects username shorter than 3 chars", async () => {
      const result = await service.upsertProfile("user-1", { username: "ab" });
      expect(result).toBeNull();
      expect(mockRepo.upsertProfile).not.toHaveBeenCalled();
    });

    it("rejects username already taken by another user", async () => {
      mockRepo.usernameExists.mockResolvedValueOnce(true);
      mockRepo.getProfile.mockResolvedValueOnce({ user_id: "other-user", username: "filipe" });

      const result = await service.upsertProfile("user-1", { username: "filipe" });
      expect(result).toBeNull();
    });

    it("allows same user to keep their username", async () => {
      mockRepo.usernameExists.mockResolvedValueOnce(true);
      mockRepo.getProfile.mockResolvedValueOnce({ user_id: "user-1", username: "filipe" });
      mockRepo.upsertProfile.mockImplementation((p: any) => Promise.resolve(p));

      const result = await service.upsertProfile("user-1", { username: "filipe" });
      expect(result).toBeTruthy();
    });

    it("truncates username to 20 chars", async () => {
      mockRepo.upsertProfile.mockImplementation((p: any) => Promise.resolve(p));
      mockRepo.usernameExists.mockResolvedValueOnce(false);

      await service.upsertProfile("user-1", { username: "a".repeat(30) });
      expect(mockRepo.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({ username: "a".repeat(20) })
      );
    });
  });

  describe("ensureProfile", () => {
    it("returns existing profile if found", async () => {
      const existing: UserProfile = {
        user_id: "user-1", username: null, display_name: null, bio: "", is_public: false,
        referral_code: "CODE1", books_completed: 0, total_pages: 0, pomodoros_total: 0,
        bible_chapters_total: 0, created_at: "", updated_at: "",
      };
      mockRepo.getProfile.mockResolvedValueOnce(existing);
      const result = await service.ensureProfile("user-1", "Filipe");
      expect(result).toEqual(existing);
      expect(mockRepo.upsertProfile).not.toHaveBeenCalled();
    });

    it("creates profile with referral code if not found", async () => {
      mockRepo.getProfile.mockResolvedValueOnce(null);
      mockRepo.getByReferralCode.mockResolvedValueOnce(null);
      mockRepo.upsertProfile.mockImplementation((p: any) => Promise.resolve({ ...p }));

      const result = await service.ensureProfile("user-1", "Filipe");
      expect(mockRepo.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "user-1", display_name: "Filipe" })
      );
      expect(mockRepo.upsertProfile).toHaveBeenCalledWith(
        expect.objectContaining({ referral_code: expect.any(String) })
      );
    });
  });

  describe("generateReferralCode", () => {
    it("generates a code based on userId", async () => {
      mockRepo.getByReferralCode.mockResolvedValueOnce(null);
      const code = await service.generateReferralCode("user-123-abc");
      expect(code).toBeTruthy();
      expect(code.length).toBeGreaterThan(0);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it("retries if code collision", async () => {
      mockRepo.getByReferralCode
        .mockResolvedValueOnce({ user_id: "other" } as any)
        .mockResolvedValueOnce(null);
      const code = await service.generateReferralCode("user-1");
      expect(code).toBeTruthy();
      expect(mockRepo.getByReferralCode).toHaveBeenCalledTimes(2);
    });
  });
});
