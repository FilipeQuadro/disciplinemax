import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { GroupService } from "@/lib/services/group-service";
import { GroupRepository, type Group } from "@/lib/repositories/group-repository";

describe("GroupService", () => {
  let service: GroupService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      listGroups: vi.fn().mockResolvedValue([]),
      joinGroup: vi.fn().mockResolvedValue(null),
      leaveGroup: vi.fn().mockResolvedValue(true),
      getUserGroups: vi.fn().mockResolvedValue([]),
      getGroupRanking: vi.fn().mockResolvedValue([]),
      isMember: vi.fn().mockResolvedValue(false),
    };
    service = new GroupService(mockRepo);
  });

  describe("listGroups", () => {
    it("returns all groups", async () => {
      const groups: Group[] = [
        { id: "g1", name: "Jovens Igreja", slug: "jovens-igreja", description: "", created_at: "" },
        { id: "g2", name: "Vestibular", slug: "vestibular", description: "", created_at: "" },
      ];
      mockRepo.listGroups.mockResolvedValueOnce(groups);
      const result = await service.listGroups();
      expect(result).toEqual(groups);
    });
  });

  describe("joinGroup", () => {
    it("returns true on successful join", async () => {
      mockRepo.joinGroup.mockResolvedValueOnce({ id: "gm1", group_id: "g1", user_id: "user-1" });
      const result = await service.joinGroup("g1", "user-1");
      expect(result).toBe(true);
    });

    it("returns false on failure", async () => {
      mockRepo.joinGroup.mockResolvedValueOnce(null);
      const result = await service.joinGroup("g1", "user-1");
      expect(result).toBe(false);
    });
  });

  describe("leaveGroup", () => {
    it("delegates to repository", async () => {
      mockRepo.leaveGroup.mockResolvedValueOnce(true);
      const result = await service.leaveGroup("g1", "user-1");
      expect(result).toBe(true);
    });
  });

  describe("getUserGroups", () => {
    it("returns groups the user belongs to", async () => {
      const userGroups = [{ id: "g1", name: "Jovens Igreja", slug: "jovens-igreja" }];
      mockRepo.getUserGroups.mockResolvedValueOnce(userGroups);
      const result = await service.getUserGroups("user-1");
      expect(result).toEqual(userGroups);
    });
  });

  describe("getGroupRanking", () => {
    it("returns ranking from repository", async () => {
      const ranking = [
        { user_id: "u1", username: "alice", display_name: "Alice", xp: 1000 },
        { user_id: "u2", username: "bob", display_name: "Bob", xp: 500 },
      ];
      mockRepo.getGroupRanking.mockResolvedValueOnce(ranking);
      const result = await service.getGroupRanking("g1");
      expect(result).toEqual(ranking);
    });
  });

  describe("isMember", () => {
    it("returns true when user is member", async () => {
      mockRepo.isMember.mockResolvedValueOnce(true);
      const result = await service.isMember("g1", "user-1");
      expect(result).toBe(true);
    });

    it("returns false when user is not member", async () => {
      mockRepo.isMember.mockResolvedValueOnce(false);
      const result = await service.isMember("g1", "user-1");
      expect(result).toBe(false);
    });
  });
});
