import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { GroupRepository, type Group, type GroupMember } from "@/lib/repositories/group-repository";

function createChainable(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  chain.then = (resolve: any) => resolve({ data: null, error: null, ...overrides });
  Object.assign(chain, overrides);
  return chain;
}

describe("GroupRepository", () => {
  let repo: GroupRepository;
  let chain: any;
  let client: any;

  beforeEach(() => {
    vi.clearAllMocks();
    chain = createChainable();
    const fromMock = vi.fn().mockReturnValue(chain);
    client = { from: fromMock };
    repo = new GroupRepository(client);
  });

  describe("listGroups", () => {
    it("returns all groups ordered by name", async () => {
      const groups: Group[] = [
        { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" },
        { id: "g2", name: "Beta", slug: "beta", description: "B", created_at: "" },
      ];
      chain.then = (resolve: any) => resolve({ data: groups, error: null });
      const result = await repo.listGroups();
      expect(result).toEqual(groups);
      expect(chain.order).toHaveBeenCalledWith("name");
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.listGroups();
      expect(result).toEqual([]);
    });
  });

  describe("getGroupBySlug", () => {
    it("returns group matching slug", async () => {
      const group: Group = { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" };
      chain.maybeSingle.mockResolvedValueOnce({ data: group, error: null });
      const result = await repo.getGroupBySlug("alpha");
      expect(result).toEqual(group);
      expect(chain.eq).toHaveBeenCalledWith("slug", "alpha");
    });

    it("returns null when slug not found", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.getGroupBySlug("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("joinGroup", () => {
    it("returns group member on success", async () => {
      const member: GroupMember = { id: "gm1", group_id: "g1", user_id: "u1", joined_at: "" };
      chain.maybeSingle.mockResolvedValueOnce({ data: member, error: null });
      const result = await repo.joinGroup("g1", "u1");
      expect(result).toEqual(member);
      expect(chain.upsert).toHaveBeenCalledWith(
        { group_id: "g1", user_id: "u1" },
        { onConflict: "group_id,user_id" },
      );
    });

    it("returns null on db error", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });
      const result = await repo.joinGroup("g1", "u1");
      expect(result).toBeNull();
    });
  });

  describe("leaveGroup", () => {
    it("returns true on success", async () => {
      chain.then = (resolve: any) => resolve({ error: null });
      const result = await repo.leaveGroup("g1", "u1");
      expect(result).toBe(true);
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith("group_id", "g1");
      expect(chain.eq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("returns false on error", async () => {
      chain.then = (resolve: any) => resolve({ error: { message: "fail" } });
      const result = await repo.leaveGroup("g1", "u1");
      expect(result).toBe(false);
    });
  });

  describe("getUserGroups", () => {
    it("returns groups the user belongs to", async () => {
      const data = [
        { group_id: "g1", groups: { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" } },
        { group_id: "g2", groups: { id: "g2", name: "Beta", slug: "beta", description: "B", created_at: "" } },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getUserGroups("u1");
      expect(result).toEqual([
        { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" },
        { id: "g2", name: "Beta", slug: "beta", description: "B", created_at: "" },
      ]);
    });

    it("filters out null groups", async () => {
      const data = [
        { group_id: "g1", groups: { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" } },
        { group_id: "g2", groups: null },
      ];
      chain.then = (resolve: any) => resolve({ data, error: null });
      const result = await repo.getUserGroups("u1");
      expect(result).toEqual([
        { id: "g1", name: "Alpha", slug: "alpha", description: "A", created_at: "" },
      ]);
    });

    it("returns empty array on null data", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getUserGroups("u1");
      expect(result).toEqual([]);
    });
  });

  describe("getGroupMembers", () => {
    it("returns members ordered by joined_at", async () => {
      const members: GroupMember[] = [
        { id: "gm1", group_id: "g1", user_id: "u1", joined_at: "2024-01-01" },
        { id: "gm2", group_id: "g1", user_id: "u2", joined_at: "2024-01-02" },
      ];
      chain.then = (resolve: any) => resolve({ data: members, error: null });
      const result = await repo.getGroupMembers("g1");
      expect(result).toEqual(members);
      expect(chain.eq).toHaveBeenCalledWith("group_id", "g1");
      expect(chain.order).toHaveBeenCalledWith("joined_at", { ascending: true });
    });

    it("returns empty array on null", async () => {
      chain.then = (resolve: any) => resolve({ data: null, error: null });
      const result = await repo.getGroupMembers("g1");
      expect(result).toEqual([]);
    });
  });

  describe("isMember", () => {
    it("returns true when user is a member", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: { id: "gm1" }, error: null });
      const result = await repo.isMember("g1", "u1");
      expect(result).toBe(true);
    });

    it("returns false when user is not a member", async () => {
      chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      const result = await repo.isMember("g1", "u1");
      expect(result).toBe(false);
    });
  });

  describe("getGroupRanking", () => {
    it("returns empty array when group has no members", async () => {
      // Mock getGroupMembers to return empty
      chain.then = (resolve: any) => resolve({ data: [], error: null });
      const result = await repo.getGroupRanking("g1");
      expect(result).toEqual([]);
    });

    it("returns ranked members with xp data", async () => {
      // First call: getGroupMembers
      const members: GroupMember[] = [
        { id: "gm1", group_id: "g1", user_id: "u1", joined_at: "" },
        { id: "gm2", group_id: "g1", user_id: "u2", joined_at: "" },
      ];
      chain.then = (resolve: any) => resolve({ data: members, error: null });

      // Second call: user_xp query (needs separate chain)
      const xpChain = createChainable();
      const xpData = [
        { user_id: "u1", total_xp: 500, user_profiles: { username: "alice", display_name: "Alice" } },
        { user_id: "u2", total_xp: 300, user_profiles: { username: "bob", display_name: "Bob" } },
      ];
      xpChain.then = (resolve: any) => resolve({ data: xpData, error: null });
      client.from = vi.fn()
        .mockReturnValueOnce(chain)     // getGroupMembers call
        .mockReturnValueOnce(xpChain);  // user_xp query

      const result = await repo.getGroupRanking("g1");
      expect(result).toEqual([
        { user_id: "u1", username: "alice", display_name: "Alice", xp: 500 },
        { user_id: "u2", username: "bob", display_name: "Bob", xp: 300 },
      ]);
    });
  });
});
