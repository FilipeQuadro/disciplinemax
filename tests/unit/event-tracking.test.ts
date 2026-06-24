import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventTrackingRepository, EventTrackingService, EVENT_TYPES, type EventType } from "@/lib/repositories/event-tracking-repository";

const mockFrom = vi.fn();

function createChain() {
  const store: Record<string, any> = {};
  const chain = new Proxy(() => {}, {
    get(_target, prop) {
      if (typeof prop !== "string") return () => chain;
      if (prop === "then" || prop === "catch") return undefined;
      if (store[prop]) return store[prop];
      return (..._args: any[]) => chain;
    },
  });

  // insert needs to return a thenable { error: null } for the await pattern
  store.insert = vi.fn().mockReturnValue({
    error: null,
    then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
  });
  store.select = vi.fn().mockReturnValue(chain);
  store.eq = vi.fn().mockReturnValue(chain);
  store.gte = vi.fn().mockReturnValue(chain);
  store.lt = vi.fn().mockResolvedValue({ data: [], error: null });
  store.order = vi.fn().mockReturnValue(chain);
  store.limit = vi.fn().mockReturnValue(chain);
  store.in = vi.fn().mockReturnValue(chain);
  store.delete = vi.fn().mockReturnValue(chain);

  return { chain, store };
}

vi.mock("@/lib/db-client", () => ({
  getServiceClient: () => ({ from: mockFrom }),
}));

describe("EventTrackingRepository", () => {
  let repo: EventTrackingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new EventTrackingRepository({ from: mockFrom } as any);
  });

  describe("track", () => {
    it("should insert a product event", async () => {
      const { chain, store } = createChain();
      mockFrom.mockReturnValue(chain);

      const result = await repo.track("u1", EVENT_TYPES.POMODORO_COMPLETED, { duration: 25 });

      expect(result).toBe(true);
      expect(store.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          event_type: "pomodoro_completed",
          event_data: { duration: 25 },
        })
      );
    });

    it("should return false on error", async () => {
      const { chain, store } = createChain();
      store.insert.mockResolvedValue({ error: { message: "DB error" } });
      mockFrom.mockReturnValue(chain);

      const result = await repo.track("u1", EVENT_TYPES.STREAK_EXTENDED);
      expect(result).toBe(false);
    });
  });

  describe("trackBatch", () => {
    it("should insert multiple events", async () => {
      const { chain, store } = createChain();
      store.insert.mockResolvedValue({ error: null });
      mockFrom.mockReturnValue(chain);

      const events = [
        { user_id: "u1", event_type: EVENT_TYPES.NOTIFICATION_SENT },
        { user_id: "u2", event_type: EVENT_TYPES.GOAL_COMPLETED },
      ] as Array<{ user_id: string; event_type: EventType; event_data?: Record<string, unknown> }>;

      const result = await repo.trackBatch(events);
      expect(result).toBe(2);
    });

    it("should return 0 for empty batch", async () => {
      const result = await repo.trackBatch([]);
      expect(result).toBe(0);
    });
  });

  describe("getEventCounts", () => {
    it("should return counts by event type", async () => {
      const { chain, store } = createChain();
      // The code does: .select().gte() which returns a query, then optionally .lt()
      // We need gte to return a thenable chain that also has .lt()
      const resolvedData = {
        data: [
          { event_type: "pomodoro_completed" },
          { event_type: "pomodoro_completed" },
          { event_type: "goal_completed" },
        ],
        error: null,
      };

      // Make the gte result thenable (awaitable) AND have .lt() method
      const gteResult = {
        lt: vi.fn().mockResolvedValue(resolvedData),
        then: (resolve: any) => Promise.resolve(resolvedData).then(resolve),
      };
      store.gte.mockReturnValue(gteResult);
      mockFrom.mockReturnValue(chain);

      const result = await repo.getEventCounts("2024-01-01");

      expect(result).toEqual({
        pomodoro_completed: 2,
        goal_completed: 1,
      });
    });
  });

  describe("getUniqueUsers", () => {
    it("should count unique users for an event type", async () => {
      const { chain, store } = createChain();
      store.eq.mockReturnValue({
        gte: vi.fn().mockResolvedValue({
          data: [
            { user_id: "u1" },
            { user_id: "u2" },
            { user_id: "u1" },
          ],
          error: null,
        }),
      });
      mockFrom.mockReturnValue(chain);

      const result = await repo.getUniqueUsers(EVENT_TYPES.POMODORO_COMPLETED, "2024-01-01");
      expect(result).toBe(2);
    });
  });
});

describe("EventTrackingService", () => {
  let service: EventTrackingService;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      track: vi.fn().mockResolvedValue(true),
      trackBatch: vi.fn().mockResolvedValue(2),
    };
    service = new EventTrackingService(mockRepo);
  });

  describe("track", () => {
    it("should call repository track and increment metrics", async () => {
      await service.track("u1", EVENT_TYPES.BOOK_FINISHED, { title: "Test" });
      expect(mockRepo.track).toHaveBeenCalledWith("u1", "book_finished", { title: "Test" });
    });
  });

  describe("trackBatch", () => {
    it("should call repository trackBatch", async () => {
      const events = [
        { user_id: "u1", event_type: EVENT_TYPES.STREAK_EXTENDED },
        { user_id: "u2", event_type: EVENT_TYPES.STREAK_BROKEN },
      ] as Array<{ user_id: string; event_type: EventType; event_data?: Record<string, unknown> }>;

      const result = await service.trackBatch(events);
      expect(result).toBe(2);
      expect(mockRepo.trackBatch).toHaveBeenCalledWith(events);
    });
  });
});

describe("EVENT_TYPES", () => {
  it("should have all required event types", () => {
    expect(EVENT_TYPES.USER_REGISTERED).toBe("user_registered");
    expect(EVENT_TYPES.NOTIFICATION_SENT).toBe("notification_sent");
    expect(EVENT_TYPES.NOTIFICATION_OPENED).toBe("notification_opened");
    expect(EVENT_TYPES.GOAL_COMPLETED).toBe("goal_completed");
    expect(EVENT_TYPES.BOOK_FINISHED).toBe("book_finished");
    expect(EVENT_TYPES.POMODORO_COMPLETED).toBe("pomodoro_completed");
    expect(EVENT_TYPES.STREAK_EXTENDED).toBe("streak_extended");
    expect(EVENT_TYPES.STREAK_BROKEN).toBe("streak_broken");
    expect(EVENT_TYPES.ONBOARDING_COMPLETED).toBe("onboarding_completed");
    expect(EVENT_TYPES.PAGE_REGISTERED).toBe("page_registered");
    expect(EVENT_TYPES.BIBLE_CHAPTER_READ).toBe("bible_chapter_read");
  });
});
