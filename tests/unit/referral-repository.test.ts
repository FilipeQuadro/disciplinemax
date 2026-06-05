import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { ReferralRepository, type Referral } from "@/lib/repositories/referral-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("ReferralRepository", () => {
  let repo: ReferralRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new ReferralRepository(client);
  });

  describe("createReferral", () => {
    it("returns referral on success", async () => {
      const referral: Referral = {
        id: "r1", referrer_id: "u1", invitee_id: "u2", referral_code: "ABC", created_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: referral, error: null });
      const result = await repo.createReferral("u1", "u2", "ABC");
      expect(result).toEqual(referral);
      expect(chain.insert).toHaveBeenCalledWith({
        referrer_id: "u1", invitee_id: "u2", referral_code: "ABC",
      });
    });

    it("returns null on db error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "duplicate" } });
      const result = await repo.createReferral("u1", "u2", "ABC");
      expect(result).toBeNull();
    });
  });

  describe("getReferralsByReferrer", () => {
    it("returns referrals ordered by date", async () => {
      const referrals: Referral[] = [
        { id: "r1", referrer_id: "u1", invitee_id: "u2", referral_code: "ABC", created_at: "2024-01-02" },
        { id: "r2", referrer_id: "u1", invitee_id: "u3", referral_code: "ABC", created_at: "2024-01-01" },
      ];
      chain.then = (resolve: any) => resolve({ data: referrals, error: null });
      const result = await repo.getReferralsByReferrer("u1");
      expect(result).toEqual(referrals);
      expect(chain.eq).toHaveBeenCalledWith("referrer_id", "u1");
      expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getReferralsByReferrer("u1");
      expect(result).toEqual([]);
    });
  });

  describe("getReferralByInvitee", () => {
    it("returns referral for invitee", async () => {
      const referral: Referral = {
        id: "r1", referrer_id: "u1", invitee_id: "u2", referral_code: "ABC", created_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: referral, error: null });
      const result = await repo.getReferralByInvitee("u2");
      expect(result).toEqual(referral);
      expect(chain.eq).toHaveBeenCalledWith("invitee_id", "u2");
    });

    it("returns null when no referral for invitee", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getReferralByInvitee("u2");
      expect(result).toBeNull();
    });
  });

  describe("getReferralCount", () => {
    it("returns count of referrals", async () => {
      chain.then = (resolve: any) => resolve({ count: 3, error: null });
      const result = await repo.getReferralCount("u1");
      expect(result).toBe(3);
    });

    it("returns 0 when count is null", async () => {
      chain.then = (resolve: any) => resolve({ count: null, error: null });
      const result = await repo.getReferralCount("u1");
      expect(result).toBe(0);
    });
  });
});
