import { describe, it, expect } from "vitest";
import { NotificationSchedulerService } from "@/lib/services/notification-scheduler-service";

// ── Cron time matching logic (now in NotificationSchedulerService) ──────────

describe("NotificationSchedulerService — time matching", () => {
  it("matches a valid notification time within tolerance", () => {
    const result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 15, ["07:00", "12:00", "19:00"]);
    expect(result).toBe("07:00");
  });

  it("does not match when outside tolerance", () => {
    const result = NotificationSchedulerService.matchNotificationTime(8 * 60, ["07:00"]);
    expect(result).toBeNull();
  });

  it("matches exactly at notification time", () => {
    const result = NotificationSchedulerService.matchNotificationTime(12 * 60, ["12:00"]);
    expect(result).toBe("12:00");
  });

  it("matches at the last minute of tolerance (29 min after)", () => {
    const result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 29, ["07:00"]);
    expect(result).toBe("07:00");
  });

  it("does not match at exactly 30 min after (boundary)", () => {
    const result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 30, ["07:00"]);
    expect(result).toBeNull();
  });
});

describe("NotificationSchedulerService — deduplication key", () => {
  it("generates unique key per user/day/time", () => {
    const key1 = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "07:00");
    const key2 = NotificationSchedulerService.buildDedupKey("user2", "2026-01-01", "07:00");
    expect(key1).not.toBe(key2);
  });

  it("generates same key for same inputs", () => {
    const key1 = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "07:00");
    const key2 = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "07:00");
    expect(key1).toBe(key2);
  });

  it("different times produce different keys", () => {
    const key1 = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "07:00");
    const key2 = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "12:00");
    expect(key1).not.toBe(key2);
  });
});

describe("NotificationSchedulerService — multiple users", () => {
  it("handles multiple users with different notification times", () => {
    const user1Result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 10, ["07:00"]);
    const user2Result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 10, ["12:00"]);

    expect(user1Result).toBe("07:00");
    expect(user2Result).toBeNull();
  });

  it("handles multiple users with same notification time", () => {
    const user1Result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 10, ["07:00"]);
    const user2Result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 10, ["07:00"]);

    expect(user1Result).toBe("07:00");
    expect(user2Result).toBe("07:00");
  });
});

describe("NotificationSchedulerService — invalid time formats", () => {
  it("handles empty notification times array", () => {
    const result = NotificationSchedulerService.matchNotificationTime(7 * 60, []);
    expect(result).toBeNull();
  });

  it("handles malformed time strings gracefully", () => {
    const result = NotificationSchedulerService.matchNotificationTime(7 * 60, ["abc"]);
    expect(result).toBeNull();
  });
});
