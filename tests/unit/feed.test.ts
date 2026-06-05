import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn(),
}));

vi.mock("@/lib/metrics", () => ({
  MetricsService: {
    measure: (_label: string, fn: () => Promise<any>) => fn(),
  },
}));

import { FeedService, FEED_EVENT_TYPES } from "@/lib/services/feed-service";
import { FeedRepository, type FeedEvent } from "@/lib/repositories/feed-repository";

describe("FeedService", () => {
  let service: FeedService;
  let mockRepo: any;
  let mockFriendshipService: any;
  let mockEventService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getFriendsFeed: vi.fn().mockResolvedValue([]),
      getUserFeed: vi.fn().mockResolvedValue([]),
    };
    mockFriendshipService = {
      getFriendIds: vi.fn().mockResolvedValue([]),
    };
    mockEventService = {
      track: vi.fn().mockResolvedValue(undefined),
    };
    service = new FeedService(mockRepo, mockFriendshipService, mockEventService);
  });

  describe("FEED_EVENT_TYPES", () => {
    it("has the expected event types", () => {
      expect(FEED_EVENT_TYPES.ACHIEVEMENT_UNLOCKED).toBe("achievement_unlocked");
      expect(FEED_EVENT_TYPES.CHALLENGE_COMPLETED).toBe("challenge_completed");
      expect(FEED_EVENT_TYPES.STREAK_RECORD).toBe("streak_record");
      expect(FEED_EVENT_TYPES.BOOK_FINISHED).toBe("book_finished");
    });
  });

  describe("getFeed", () => {
    it("returns only user feed when no friends", async () => {
      mockFriendshipService.getFriendIds.mockResolvedValueOnce([]);
      const userFeed = [{ id: "1", user_id: "user-1", event_type: "achievement_unlocked", event_data: {}, created_at: "" }];
      mockRepo.getUserFeed.mockResolvedValueOnce(userFeed);

      const result = await service.getFeed("user-1");
      expect(result).toEqual(userFeed);
      expect(mockRepo.getFriendsFeed).not.toHaveBeenCalled();
    });

    it("combines friends and own feed", async () => {
      mockFriendshipService.getFriendIds.mockResolvedValueOnce(["user-2"]);
      const friendFeed = [{ id: "2", user_id: "user-2", event_type: "book_finished", event_data: {}, created_at: "2024-01-01T12:00:00Z" }];
      const ownFeed = [{ id: "1", user_id: "user-1", event_type: "achievement_unlocked", event_data: {}, created_at: "2024-01-01T11:00:00Z" }];
      mockRepo.getFriendsFeed.mockResolvedValueOnce(friendFeed);
      mockRepo.getUserFeed.mockResolvedValueOnce(ownFeed);

      const result = await service.getFeed("user-1");
      expect(result).toHaveLength(2);
      // Should be sorted by created_at desc
      expect(result[0].id).toBe("2");
    });

    it("respects limit", async () => {
      mockFriendshipService.getFriendIds.mockResolvedValueOnce(["user-2"]);
      mockRepo.getFriendsFeed.mockResolvedValueOnce([]);
      mockRepo.getUserFeed.mockResolvedValueOnce([]);

      await service.getFeed("user-1", 10);
      expect(mockRepo.getFriendsFeed).toHaveBeenCalledWith(["user-2"], 10);
      expect(mockRepo.getUserFeed).toHaveBeenCalledWith("user-1", 5);
    });
  });

  describe("trackEvent", () => {
    it("calls eventService.track with the event type", async () => {
      await service.trackEvent("user-1", FEED_EVENT_TYPES.BOOK_FINISHED, { book_id: "book-1" });
      expect(mockEventService.track).toHaveBeenCalledWith(
        "user-1", "book_finished", { book_id: "book-1" }
      );
    });

    it("swallows errors gracefully", async () => {
      mockEventService.track.mockRejectedValueOnce(new Error("fail"));
      const result = await service.trackEvent("user-1", FEED_EVENT_TYPES.ACHIEVEMENT_UNLOCKED);
      expect(result).toBeUndefined();
    });
  });
});
