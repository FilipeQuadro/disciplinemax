import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock NotificationRepository
const mockWasAlreadySent = vi.fn();
const mockRecordSent = vi.fn();
const mockCleanupOld = vi.fn();

vi.mock("@/lib/repositories/notification-repository", () => ({
  NotificationRepository: vi.fn().mockImplementation(() => ({
    wasAlreadySent: mockWasAlreadySent,
    recordSent: mockRecordSent,
    cleanupOld: mockCleanupOld,
  })),
}));

import { NotificationDedupService } from "@/lib/services/notification-dedup-service";

describe("NotificationDedupService", () => {
  let service: NotificationDedupService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationDedupService({
      wasAlreadySent: mockWasAlreadySent,
      recordSent: mockRecordSent,
      cleanupOld: mockCleanupOld,
    } as unknown as import("@/lib/repositories/notification-repository").NotificationRepository);
  });

  describe("wasAlreadySent", () => {
    it("returns true when notification was already sent", async () => {
      mockWasAlreadySent.mockResolvedValue(true);
      const result = await service.wasAlreadySent("user1", "2026-01-01_07:00");
      expect(result).toBe(true);
      expect(mockWasAlreadySent).toHaveBeenCalledWith("user1", "2026-01-01_07:00");
    });

    it("returns false when notification was not sent", async () => {
      mockWasAlreadySent.mockResolvedValue(false);
      const result = await service.wasAlreadySent("user1", "2026-01-01_07:00");
      expect(result).toBe(false);
    });
  });

  describe("recordSent", () => {
    it("records a sent notification", async () => {
      await service.recordSent("user1", "2026-01-01_07:00");
      expect(mockRecordSent).toHaveBeenCalledWith("user1", "2026-01-01_07:00");
    });
  });

  describe("shouldSend", () => {
    it("returns true and records when not already sent", async () => {
      mockWasAlreadySent.mockResolvedValue(false);
      const result = await service.shouldSend("user1", "2026-01-01_07:00");
      expect(result).toBe(true);
      expect(mockRecordSent).toHaveBeenCalledWith("user1", "2026-01-01_07:00");
    });

    it("returns false and does not record when already sent", async () => {
      mockWasAlreadySent.mockResolvedValue(true);
      const result = await service.shouldSend("user1", "2026-01-01_07:00");
      expect(result).toBe(false);
      expect(mockRecordSent).not.toHaveBeenCalled();
    });
  });

  describe("cleanupOlderThan", () => {
    it("delegates to repository cleanup", async () => {
      await service.cleanupOlderThan("2026-01-01");
      expect(mockCleanupOld).toHaveBeenCalledWith("2026-01-01");
    });
  });
});
