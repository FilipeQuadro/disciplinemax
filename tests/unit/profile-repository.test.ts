import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { ProfileRepository, type UserProfile } from "@/lib/repositories/profile-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("ProfileRepository", () => {
  let repo: ProfileRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new ProfileRepository(client);
  });

  describe("getProfile", () => {
    it("returns profile when found", async () => {
      const profile: UserProfile = {
        user_id: "u1", username: "filipe", display_name: "Filipe", bio: "hi",
        is_public: true, referral_code: "ABC", books_completed: 0, total_pages: 0,
        pomodoros_total: 0, bible_chapters_total: 0, created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
      const result = await repo.getProfile("u1");
      expect(result).toEqual(profile);
      expect(client.from).toHaveBeenCalledWith("user_profiles");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("returns null when not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getProfile("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getByUsername", () => {
    it("returns public profile by username", async () => {
      const profile = { user_id: "u1", username: "filipe", is_public: true };
      chain.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
      const result = await repo.getByUsername("filipe");
      expect(result).toEqual(profile);
      expect(chain.eq).toHaveBeenCalledWith("username", "filipe");
      expect(chain.eq).toHaveBeenCalledWith("is_public", true);
    });

    it("returns null when username not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getByUsername("nobody");
      expect(result).toBeNull();
    });
  });

  describe("getByReferralCode", () => {
    it("returns profile matching referral code", async () => {
      const profile = { user_id: "u1", referral_code: "ABC123" };
      chain.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
      const result = await repo.getByReferralCode("ABC123");
      expect(result).toEqual(profile);
      expect(chain.eq).toHaveBeenCalledWith("referral_code", "ABC123");
    });

    it("returns null when code not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getByReferralCode("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("upsertProfile", () => {
    it("returns upserted profile on success", async () => {
      const profile: UserProfile = {
        user_id: "u1", username: "filipe", display_name: "Filipe", bio: "",
        is_public: true, referral_code: "ABC", books_completed: 0, total_pages: 0,
        pomodoros_total: 0, bible_chapters_total: 0, created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: profile, error: null });
      const result = await repo.upsertProfile({ user_id: "u1", username: "filipe" });
      expect(result).toEqual(profile);
      expect(chain.upsert).toHaveBeenCalled();
    });

    it("returns null on error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "duplicate" } });
      const result = await repo.upsertProfile({ user_id: "u1", username: "taken" });
      expect(result).toBeNull();
    });
  });

  describe("updateStats", () => {
    it("returns updated profile on success", async () => {
      const updated = { user_id: "u1", books_completed: 5, total_pages: 100 };
      chain.maybeSingle.mockResolvedValueOnce({ data: updated, error: null });
      const result = await repo.updateStats("u1", { books_completed: 5, total_pages: 100 });
      expect(result).toEqual(updated);
      expect(chain.update).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("returns null on error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.updateStats("u1", { books_completed: 5 });
      expect(result).toBeNull();
    });
  });

  describe("usernameExists", () => {
    it("returns true when username exists", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: { user_id: "other" }, error: null });
      const result = await repo.usernameExists("filipe");
      expect(result).toBe(true);
    });

    it("returns false when username does not exist", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.usernameExists("nobody");
      expect(result).toBe(false);
    });
  });
});
