import { describe, it, expect } from "vitest";
import { NotificationSchedulerService } from "@/lib/services/notification-scheduler-service";
import type { UserSettings } from "@/lib/supabase";

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    id: "s1",
    user_id: "user1",
    notification_times: ["07:00", "12:00", "19:00"],
    pomodoro_duration: 25,
    short_break: 5,
    long_break: 15,
    pomodoros_until_long: 4,
    daily_books_goal: 20,
    daily_bible_chapters: 3,
    timezone: "America/Sao_Paulo",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationSchedulerService", () => {
  describe("matchNotificationTime", () => {
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

    it("returns null for empty notification times", () => {
      const result = NotificationSchedulerService.matchNotificationTime(7 * 60, []);
      expect(result).toBeNull();
    });

    it("handles malformed time strings gracefully", () => {
      const result = NotificationSchedulerService.matchNotificationTime(7 * 60, ["abc"]);
      expect(result).toBeNull();
    });

    it("prefers earlier match when multiple times match", () => {
      const result = NotificationSchedulerService.matchNotificationTime(7 * 60 + 10, ["07:00", "07:05"]);
      expect(result).toBe("07:00");
    });
  });

  describe("buildDedupKey", () => {
    it("constructs key from userId, date, and matchedTime", () => {
      const key = NotificationSchedulerService.buildDedupKey("user1", "2026-01-01", "07:00");
      expect(key).toBe("user1_2026-01-01_07:00");
    });
  });

  describe("checkSchedule", () => {
    it("returns shouldSend=true when time matches", () => {
      const settings = makeSettings();
      const result = NotificationSchedulerService.checkSchedule(7 * 60 + 15, settings, "2026-01-01");
      expect(result.shouldSend).toBe(true);
      expect(result.matchedTime).toBe("07:00");
      expect(result.dedupKey).toBe("user1_2026-01-01_07:00");
    });

    it("returns shouldSend=false when no time matches", () => {
      const settings = makeSettings();
      const result = NotificationSchedulerService.checkSchedule(3 * 60, settings, "2026-01-01");
      expect(result.shouldSend).toBe(false);
      expect(result.matchedTime).toBeNull();
      expect(result.dedupKey).toBeNull();
    });

    it("uses default notification times when not set", () => {
      const settings = makeSettings({ notification_times: undefined as unknown as string[] });
      const result = NotificationSchedulerService.checkSchedule(7 * 60 + 10, settings, "2026-01-01");
      expect(result.shouldSend).toBe(true);
    });
  });

  describe("getTodayBrt", () => {
    it("returns a date string in YYYY-MM-DD format", () => {
      const today = NotificationSchedulerService.getTodayBrt();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getCurrentBrtMinutes", () => {
    it("returns a number between 0 and 1439", () => {
      const minutes = NotificationSchedulerService.getCurrentBrtMinutes();
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(1439);
    });
  });

  describe("isMidnightBrt", () => {
    it("returns a boolean", () => {
      const result = NotificationSchedulerService.isMidnightBrt();
      expect(typeof result).toBe("boolean");
    });
  });
});
