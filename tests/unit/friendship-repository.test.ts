import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { FriendshipRepository, type Friendship } from "@/lib/repositories/friendship-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("FriendshipRepository", () => {
  let repo: FriendshipRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new FriendshipRepository(client);
  });

  describe("sendRequest", () => {
    it("returns null when requester equals addressee", async () => {
      const result = await repo.sendRequest("u1", "u1");
      expect(result).toBeNull();
      expect(client.from).not.toHaveBeenCalled();
    });

    it("returns friendship on success", async () => {
      const friendship: Friendship = {
        id: "f1", requester_id: "u1", addressee_id: "u2",
        status: "pending", created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: friendship, error: null });
      const result = await repo.sendRequest("u1", "u2");
      expect(result).toEqual(friendship);
      expect(chain.upsert).toHaveBeenCalled();
    });

    it("returns null on db error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.sendRequest("u1", "u2");
      expect(result).toBeNull();
    });
  });

  describe("acceptRequest", () => {
    it("returns updated friendship on success", async () => {
      const accepted: Friendship = {
        id: "f1", requester_id: "u1", addressee_id: "u2",
        status: "accepted", created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: accepted, error: null });
      const result = await repo.acceptRequest("u1", "u2");
      expect(result).toEqual(accepted);
      expect(chain.update).toHaveBeenCalled();
    });

    it("returns null on error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.acceptRequest("u1", "u2");
      expect(result).toBeNull();
    });
  });

  describe("removeFriend", () => {
    it("returns true on success", async () => {
      chain.then = (resolve: any) => resolve({ error: null });
      const result = await repo.removeFriend("u1", "u2");
      expect(result).toBe(true);
      expect(chain.delete).toHaveBeenCalled();
    });

    it("returns false on error", async () => {
      chain.then = (resolve: any) => resolve({ error: { message: "fail" } });
      const result = await repo.removeFriend("u1", "u2");
      expect(result).toBe(false);
    });
  });

  describe("getFriends", () => {
    it("returns accepted friendships", async () => {
      const friends: Friendship[] = [
        { id: "f1", requester_id: "u1", addressee_id: "u2", status: "accepted", created_at: "", updated_at: "" },
      ];
      chain.then = (resolve: any) => resolve({ data: friends, error: null });
      const result = await repo.getFriends("u1");
      expect(result).toEqual(friends);
      expect(chain.eq).toHaveBeenCalledWith("status", "accepted");
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getFriends("u1");
      expect(result).toEqual([]);
    });
  });

  describe("getPendingRequests", () => {
    it("returns pending requests for user", async () => {
      const pending: Friendship[] = [
        { id: "f2", requester_id: "u3", addressee_id: "u1", status: "pending", created_at: "", updated_at: "" },
      ];
      chain.then = (resolve: any) => resolve({ data: pending, error: null });
      const result = await repo.getPendingRequests("u1");
      expect(result).toEqual(pending);
      expect(chain.eq).toHaveBeenCalledWith("addressee_id", "u1");
      expect(chain.eq).toHaveBeenCalledWith("status", "pending");
    });

    it("returns empty array on null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getPendingRequests("u1");
      expect(result).toEqual([]);
    });
  });

  describe("getFriendship", () => {
    it("returns friendship between two users", async () => {
      const friendship: Friendship = {
        id: "f1", requester_id: "u1", addressee_id: "u2", status: "accepted", created_at: "", updated_at: "",
      };
      chain.maybeSingle.mockResolvedValueOnce({ data: friendship, error: null });
      const result = await repo.getFriendship("u1", "u2");
      expect(result).toEqual(friendship);
    });

    it("returns null when no friendship exists", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getFriendship("u1", "u3");
      expect(result).toBeNull();
    });
  });

  describe("getFriendCount", () => {
    it("returns count of accepted friendships", async () => {
      chain.then = (resolve: any) => resolve({ count: 5, error: null });
      const result = await repo.getFriendCount("u1");
      expect(result).toBe(5);
    });

    it("returns 0 when count is null", async () => {
      chain.then = (resolve: any) => resolve({ count: null, error: null });
      const result = await repo.getFriendCount("u1");
      expect(result).toBe(0);
    });
  });
});
