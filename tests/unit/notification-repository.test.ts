import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationRepository } from "@/lib/repositories/notification-repository";

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockLt = vi.fn();
const mockMaybeSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

function createMockClient() {
  const chain = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    eq: mockEq,
    lt: mockLt,
    maybeSingle: mockMaybeSingle,
    order: mockOrder,
    limit: mockLimit,
  };
  // Setup chaining
  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockDelete.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockLt.mockReturnValue(chain);
  mockMaybeSingle.mockResolvedValue({ data: null });
  mockOrder.mockReturnValue(chain);
  mockLimit.mockReturnValue(chain);

  return {
    from: vi.fn().mockReturnValue(chain),
  };
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => createMockClient()),
}));

describe("NotificationRepository", () => {
  let repo: NotificationRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new NotificationRepository();
  });

  describe("wasAlreadySent", () => {
    it("returns true when notification exists", async () => {
      mockMaybeSingle.mockResolvedValue({ data: { id: "1" } });
      const result = await repo.wasAlreadySent("user1", "2026-01-01_07:00");
      expect(result).toBe(true);
    });

    it("returns false when notification does not exist", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null });
      const result = await repo.wasAlreadySent("user1", "2026-01-01_07:00");
      expect(result).toBe(false);
    });
  });

  describe("recordSent", () => {
    it("inserts a record without error", async () => {
      mockInsert.mockReturnValue({ error: null });
      await repo.recordSent("user1", "2026-01-01_07:00");
      // No throw = success
    });

    it("ignores UNIQUE constraint violations", async () => {
      mockInsert.mockReturnValue({ error: { code: "23505" } });
      await repo.recordSent("user1", "2026-01-01_07:00");
      // No throw = handled
    });
  });

  describe("cleanupOld", () => {
    it("deletes old records", async () => {
      mockLt.mockReturnValue({ error: null });
      await repo.cleanupOld("2026-01-01");
      expect(mockLt).toHaveBeenCalled();
    });
  });

  describe("getRecent", () => {
    it("returns recent notifications", async () => {
      mockLimit.mockResolvedValue({
        data: [{ sent_at: "2026-01-01T07:00:00Z", notif_key: "2026-01-01_07:00" }],
      });
      const result = await repo.getRecent(10);
      expect(result).toHaveLength(1);
    });
  });
});
