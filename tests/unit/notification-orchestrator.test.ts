import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock telegram
vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

// Mock web-push
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

vi.mock("@/lib/web-push-server", () => ({
  sendWebPush: vi.fn().mockResolvedValue({ sent: 1, failed: 0, expiredEndpoints: [] }),
  cleanupExpiredSubscriptions: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/ai", () => ({
  getMotivationalMessage: vi.fn().mockResolvedValue("Stay strong!"),
  getBibleVerseOfDay: vi.fn().mockResolvedValue({ verse: "Test verse", reference: "Test 1:1" }),
  callOllama: vi.fn().mockResolvedValue(null),
}));

import { NotificationOrchestrator } from "@/lib/services/notification-orchestrator";
import { NotificationDedupService } from "@/lib/services/notification-dedup-service";
import { NotificationDeliveryService } from "@/lib/services/notification-delivery-service";
import type { UserSettings, Book, BibleGoal, DailyStats } from "@/lib/supabase";

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    id: "s1", user_id: "user1",
    notification_times: ["07:00"],
    pomodoro_duration: 25, short_break: 5, long_break: 15, pomodoros_until_long: 4,
    daily_books_goal: 20, daily_bible_chapters: 3,
    timezone: "America/Sao_Paulo", updated_at: new Date().toISOString(),
    telegram_bot_token: "123456:ABC-DEF", telegram_chat_id: "123456789",
    ...overrides,
  };
}

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1", user_id: "user1", title: "Test Book", total_pages: 200,
    current_page: 50, daily_goal: 20, pages_read_today: 10, color: "#000",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeBibleGoal(overrides: Partial<BibleGoal> = {}): BibleGoal {
  return {
    id: "bg1", user_id: "user1", daily_chapters: 3, current_book: "Genesis",
    current_chapter: 1, start_date: "2026-01-01", updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStats(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: "ds1", user_id: "user1", date: "2026-01-01", books_pages_read: 10,
    bible_chapters_read: 1, pomodoros_completed: 0, total_focus_minutes: 0,
    goals_completed: false, streak_day: 5,
    ...overrides,
  };
}

describe("NotificationOrchestrator", () => {
  let orchestrator: NotificationOrchestrator;
  let mockDedupService: NotificationDedupService;
  let mockDeliveryService: NotificationDeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock dedup service
    mockDedupService = {
      shouldSend: vi.fn().mockResolvedValue(true),
      wasAlreadySent: vi.fn().mockResolvedValue(false),
      recordSent: vi.fn().mockResolvedValue(undefined),
      cleanupOlderThan: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationDedupService;

    // Create mock delivery service
    mockDeliveryService = {
      deliverToUser: vi.fn().mockResolvedValue({
        telegramSent: 1, pushSent: 1, telegramErrors: 0, pushErrors: 0, expiredEndpoints: [],
      }),
      sendTelegram: vi.fn().mockResolvedValue(true),
      sendPush: vi.fn().mockResolvedValue({ sent: 1, expiredEndpoints: [] }),
      sendPushToUser: vi.fn().mockResolvedValue({ sent: 1, expiredEndpoints: [] }),
    } as unknown as NotificationDeliveryService;

    // Inject mocks into orchestrator
    orchestrator = new NotificationOrchestrator();
    (orchestrator as unknown as { dedupService: NotificationDedupService }).dedupService = mockDedupService;
    (orchestrator as unknown as { deliveryService: NotificationDeliveryService }).deliveryService = mockDeliveryService;
  });

  describe("processDailyNotification", () => {
    it("sends notification when time matches and not already sent", async () => {
      const result = await orchestrator.processDailyNotification(
        makeSettings(), "2026-01-01", 7 * 60 + 15,
        [makeBook()], makeBibleGoal(), makeStats(), 7
      );
      expect(result).toBe("sent");
      expect(mockDeliveryService.deliverToUser).toHaveBeenCalled();
    });

    it("skips when time does not match", async () => {
      const result = await orchestrator.processDailyNotification(
        makeSettings(), "2026-01-01", 3 * 60,
        [makeBook()], makeBibleGoal(), makeStats(), 3
      );
      expect(result).toBe("skipped");
      expect(mockDeliveryService.deliverToUser).not.toHaveBeenCalled();
    });

    it("skips when already sent (dedup)", async () => {
      (mockDedupService.shouldSend as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const result = await orchestrator.processDailyNotification(
        makeSettings(), "2026-01-01", 7 * 60 + 15,
        [makeBook()], makeBibleGoal(), makeStats(), 7
      );
      expect(result).toBe("skipped");
    });
  });

  describe("runDailyCron", () => {
    it("processes multiple users", async () => {
      const settings = [
        makeSettings({ user_id: "user1" }),
        makeSettings({ user_id: "user2", notification_times: ["07:00"] }),
      ];
      const books = [makeBook({ user_id: "user1" }), makeBook({ user_id: "user2" })];

      const result = await orchestrator.runDailyCron(
        settings, books, [], [], "2026-01-01", 7 * 60 + 15, 7
      );

      // Both users match 07:00, mock delivers 1 tg + 1 push per user
      expect(result.telegramSent).toBe(2);
      expect(result.pushSent).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it("skips all users when no time matches", async () => {
      const settings = [makeSettings()];
      const result = await orchestrator.runDailyCron(
        settings, [], [], [], "2026-01-01", 3 * 60, 3
      );
      expect(result.skipped).toBe(1);
      expect(result.telegramSent).toBe(0);
    });
  });

  describe("processWeeklyNotification", () => {
    it("delivers weekly notification to user", async () => {
      const result = await orchestrator.processWeeklyNotification(makeSettings(), {
        weekStats: [makeStats({ goals_completed: true })],
        books: [makeBook({ current_page: 200, total_pages: 200 })],
        bibleReadingsCount: 5,
        pomodoros: [{ duration_minutes: 25 }],
        recentStats: [{ goals_completed: true }],
      });
      expect(result.telegramSent).toBe(true);
    });

    it("handles user with no data", async () => {
      const result = await orchestrator.processWeeklyNotification(makeSettings(), {
        weekStats: [],
        books: [],
        bibleReadingsCount: 0,
        pomodoros: [],
        recentStats: [],
      });
      expect(typeof result.telegramSent).toBe("boolean");
    });
  });
});
