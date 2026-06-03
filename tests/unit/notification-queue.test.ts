import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationQueueRepository, RetryService } from "@/lib/repositories/notification-queue-repository";
import type { NotificationQueueEntry } from "@/lib/repositories/notification-queue-repository";

// Create a chainable Supabase mock using Proxy
function createSupabaseMock() {
  const store: Record<string, any> = {};

  const chain = new Proxy(() => {}, {
    get(_target, prop) {
      if (typeof prop !== "string") return () => chain;
      if (prop === "then" || prop === "catch") return undefined;
      if (store[prop]) return store[prop];
      return (..._args: any[]) => chain;
    },
    apply(_target, _thisArg, _args) {
      return chain;
    },
  });

  // Override specific methods
  store.insert = vi.fn().mockReturnValue(chain);
  store.delete = vi.fn().mockReturnValue(chain);
  store.update = vi.fn().mockReturnValue(chain);
  store.select = vi.fn().mockReturnValue(chain);
  store.eq = vi.fn().mockReturnValue(chain);
  store.in = vi.fn().mockReturnValue(chain);
  store.lte = vi.fn().mockReturnValue(chain);
  store.gte = vi.fn().mockReturnValue(chain);
  store.lt = vi.fn().mockReturnValue(chain);
  store.order = vi.fn().mockReturnValue(chain);
  store.limit = vi.fn().mockReturnValue(chain);
  store.single = vi.fn().mockResolvedValue({ data: null, error: null });
  store.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

  const from = vi.fn().mockReturnValue(chain);
  return { from, chain, store };
}

vi.mock("@/lib/db-client", () => ({
  getServiceClient: () => ({ from: vi.fn() }),
}));

describe("NotificationQueueRepository", () => {
  let mock: ReturnType<typeof createSupabaseMock>;
  let repo: NotificationQueueRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    mock = createSupabaseMock();
    repo = new NotificationQueueRepository({ from: mock.from } as any);
  });

  describe("enqueue", () => {
    it("should insert a new queue entry", async () => {
      mock.store.single.mockResolvedValue({
        data: { id: "q1", user_id: "u1", channel: "telegram", status: "pending" },
        error: null,
      });

      const result = await repo.enqueue("u1", "telegram", { message: "hello" });
      expect(result).not.toBeNull();
      expect(mock.store.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "u1",
          channel: "telegram",
          payload: { message: "hello" },
          status: "pending",
        })
      );
    });

    it("should return null on insert error", async () => {
      mock.store.single.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await repo.enqueue("u1", "push", { title: "hi" });
      expect(result).toBeNull();
    });
  });

  describe("markDelivered", () => {
    it("should delete entry on success", async () => {
      mock.store.eq.mockResolvedValue({ error: null });

      const result = await repo.markDelivered("q1");
      expect(result).toBe(true);
    });

    it("should return false on error", async () => {
      mock.store.eq.mockResolvedValue({ error: { message: "DB error" } });

      const result = await repo.markDelivered("q1");
      expect(result).toBe(false);
    });
  });

  describe("markFailed", () => {
    it("should increment attempts and schedule retry", async () => {
      const singleCalls = [
        { data: { attempts: 0, max_attempts: 4 }, error: null },
        { data: { id: "q1", status: "retrying", attempts: 1 }, error: null },
      ];
      let callIdx = 0;
      mock.store.single.mockImplementation(() => Promise.resolve(singleCalls[callIdx++]));

      const result = await repo.markFailed("q1", "Network error");
      expect(result).not.toBeNull();
      expect(mock.store.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "retrying", attempts: 1, last_error: "Network error" })
      );
    });

    it("should move to dead_letter when max attempts exceeded", async () => {
      const singleCalls = [
        { data: { attempts: 3, max_attempts: 4 }, error: null },
        { data: { id: "q1", status: "dead_letter", attempts: 4 }, error: null },
      ];
      let callIdx = 0;
      mock.store.single.mockImplementation(() => Promise.resolve(singleCalls[callIdx++]));

      const result = await repo.markFailed("q1", "Final failure");
      expect(result).not.toBeNull();
      expect(mock.store.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: "dead_letter", attempts: 4 })
      );
    });
  });

  describe("getDeadLetterCount", () => {
    it("should return dead letter count", async () => {
      mock.store.eq.mockResolvedValue({ count: 5, error: null });

      const result = await repo.getDeadLetterCount();
      expect(result).toBe(5);
    });
  });
});

describe("RetryService", () => {
  describe("getRetryDelay", () => {
    it("should return 0ms for attempt 1", () => expect(RetryService.getRetryDelay(1)).toBe(0));
    it("should return 5min for attempt 2", () => expect(RetryService.getRetryDelay(2)).toBe(5 * 60_000));
    it("should return 15min for attempt 3", () => expect(RetryService.getRetryDelay(3)).toBe(15 * 60_000));
    it("should return 60min for attempt 4+", () => {
      expect(RetryService.getRetryDelay(4)).toBe(60 * 60_000);
      expect(RetryService.getRetryDelay(5)).toBe(60 * 60_000);
    });
  });

  describe("processRetries", () => {
    const baseEntry: NotificationQueueEntry = {
      id: "q1", user_id: "u1", channel: "telegram",
      payload: { message: "hello" },
      status: "pending", attempts: 0, max_attempts: 4,
      next_retry_at: new Date().toISOString(), last_error: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    it("should process entries and track results", async () => {
      const queueRepo = {
        fetchReadyForRetry: vi.fn().mockResolvedValue([baseEntry]),
        markDelivered: vi.fn().mockResolvedValue(true),
        markFailed: vi.fn(),
        cleanupOld: vi.fn().mockResolvedValue(0),
      } as any;

      const result = await RetryService.processRetries(queueRepo, vi.fn().mockResolvedValue(true));
      expect(result.retried).toBe(1);
      expect(result.delivered).toBe(1);
    });

    it("should handle failed delivery", async () => {
      const queueRepo = {
        fetchReadyForRetry: vi.fn().mockResolvedValue([baseEntry]),
        markDelivered: vi.fn().mockResolvedValue(true),
        markFailed: vi.fn().mockResolvedValue({ id: "q1", status: "retrying" }),
        cleanupOld: vi.fn().mockResolvedValue(0),
      } as any;

      const result = await RetryService.processRetries(queueRepo, vi.fn().mockResolvedValue(false));
      expect(result.delivered).toBe(0);
    });

    it("should handle delivery exceptions", async () => {
      const queueRepo = {
        fetchReadyForRetry: vi.fn().mockResolvedValue([baseEntry]),
        markDelivered: vi.fn().mockResolvedValue(true),
        markFailed: vi.fn().mockResolvedValue({ id: "q1", status: "retrying" }),
        cleanupOld: vi.fn().mockResolvedValue(0),
      } as any;

      const result = await RetryService.processRetries(queueRepo, vi.fn().mockRejectedValue(new Error("timeout")));
      expect(result.failed).toBe(1);
    });

    it("should return zeros when no entries", async () => {
      const queueRepo = { fetchReadyForRetry: vi.fn().mockResolvedValue([]) } as any;
      const result = await RetryService.processRetries(queueRepo, vi.fn());
      expect(result).toEqual({ retried: 0, delivered: 0, deadLettered: 0, failed: 0 });
    });
  });
});
