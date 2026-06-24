import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { FriendshipService } from "@/lib/services/friendship-service";
import { FriendshipRepository, type Friendship } from "@/lib/repositories/friendship-repository";

describe("FriendshipService", () => {
  let service: FriendshipService;
  let mockRepo: any;
  let mockEventService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      sendRequest: vi.fn().mockResolvedValue(null),
      acceptRequest: vi.fn().mockResolvedValue(null),
      removeFriend: vi.fn().mockResolvedValue(true),
      getFriends: vi.fn().mockResolvedValue([]),
      getPendingRequests: vi.fn().mockResolvedValue([]),
      getFriendship: vi.fn().mockResolvedValue(null),
      getFriendCount: vi.fn().mockResolvedValue(0),
    };
    mockEventService = {
      track: vi.fn().mockResolvedValue(undefined),
    };
    service = new FriendshipService(mockRepo, mockEventService);
  });

  describe("sendRequest", () => {
    it("sends a friend request", async () => {
      const friendship: Friendship = {
        id: "f-1", requester_id: "user-1", addressee_id: "user-2",
        status: "pending", created_at: "", updated_at: "",
      };
      mockRepo.sendRequest.mockResolvedValueOnce(friendship);

      const result = await service.sendRequest("user-1", "user-2");
      expect(result).toEqual(friendship);
      expect(mockRepo.sendRequest).toHaveBeenCalledWith("user-1", "user-2");
    });

    it("returns null if friendship already exists", async () => {
      mockRepo.getFriendship.mockResolvedValueOnce({ id: "f-1", status: "accepted" });
      const result = await service.sendRequest("user-1", "user-2");
      expect(result).toBeNull();
      expect(mockRepo.sendRequest).not.toHaveBeenCalled();
    });

    it("tracks event on success", async () => {
      mockRepo.sendRequest.mockResolvedValueOnce({ id: "f-1" });
      await service.sendRequest("user-1", "user-2");
      expect(mockEventService.track).toHaveBeenCalledWith(
        "user-1", expect.any(String), expect.objectContaining({ addressee_id: "user-2" })
      );
    });
  });

  describe("acceptRequest", () => {
    it("accepts a pending request", async () => {
      const friendship: Friendship = {
        id: "f-1", requester_id: "user-1", addressee_id: "user-2",
        status: "accepted", created_at: "", updated_at: "",
      };
      mockRepo.acceptRequest.mockResolvedValueOnce(friendship);

      const result = await service.acceptRequest("user-1", "user-2");
      expect(result).toEqual(friendship);
      expect(mockRepo.acceptRequest).toHaveBeenCalledWith("user-1", "user-2");
    });

    it("tracks event on accept", async () => {
      mockRepo.acceptRequest.mockResolvedValueOnce({ id: "f-1" });
      await service.acceptRequest("user-1", "user-2");
      expect(mockEventService.track).toHaveBeenCalledWith(
        "user-2", expect.any(String), expect.objectContaining({ requester_id: "user-1" })
      );
    });
  });

  describe("removeFriend", () => {
    it("delegates to repository", async () => {
      mockRepo.removeFriend.mockResolvedValueOnce(true);
      const result = await service.removeFriend("user-1", "user-2");
      expect(result).toBe(true);
      expect(mockRepo.removeFriend).toHaveBeenCalledWith("user-1", "user-2");
    });
  });

  describe("getFriends", () => {
    it("returns friends list", async () => {
      const friends = [
        { requester_id: "user-1", addressee_id: "user-2", status: "accepted" },
      ];
      mockRepo.getFriends.mockResolvedValueOnce(friends);
      const result = await service.getFriends("user-1");
      expect(result).toEqual(friends);
    });
  });

  describe("getFriendIds", () => {
    it("extracts the other user id from each friendship", async () => {
      mockRepo.getFriends.mockResolvedValueOnce([
        { requester_id: "user-1", addressee_id: "user-2", status: "accepted" },
        { requester_id: "user-3", addressee_id: "user-1", status: "accepted" },
      ]);
      const ids = await service.getFriendIds("user-1");
      expect(ids).toEqual(["user-2", "user-3"]);
    });
  });

  describe("getFriendCount", () => {
    it("returns friend count", async () => {
      mockRepo.getFriendCount.mockResolvedValueOnce(5);
      const count = await service.getFriendCount("user-1");
      expect(count).toBe(5);
    });
  });
});
