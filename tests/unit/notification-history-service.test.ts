import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationHistoryService } from "@/lib/services/notification-history-service";
import type { Book, BibleGoal, DailyStats } from "@/lib/supabase";

// Mock AI
vi.mock("@/lib/ai", () => ({
  getMotivationalMessage: vi.fn().mockResolvedValue("Stay strong!"),
  getBibleVerseOfDay: vi.fn().mockResolvedValue({ verse: "Test verse", reference: "Test 1:1" }),
}));

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "b1",
    user_id: "user1",
    title: "Test Book",
    total_pages: 200,
    current_page: 50,
    daily_goal: 20,
    pages_read_today: 10,
    color: "#000",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeBibleGoal(overrides: Partial<BibleGoal> = {}): BibleGoal {
  return {
    id: "bg1",
    user_id: "user1",
    daily_chapters: 3,
    current_book: "Genesis",
    current_chapter: 1,
    start_date: "2026-01-01",
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeStats(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: "ds1",
    user_id: "user1",
    date: "2026-01-01",
    books_pages_read: 10,
    bible_chapters_read: 1,
    pomodoros_completed: 0,
    total_focus_minutes: 0,
    goals_completed: false,
    streak_day: 5,
    ...overrides,
  };
}

describe("NotificationHistoryService", () => {
  describe("calculateProgress", () => {
    it("calculates correct progress with partial completion", () => {
      const books = [makeBook({ daily_goal: 20, pages_read_today: 10 })];
      const goal = makeBibleGoal({ daily_chapters: 3 });
      const stats = makeStats({ bible_chapters_read: 1 });

      const progress = NotificationHistoryService.calculateProgress(books, goal, stats);

      expect(progress.totalPagesGoal).toBe(20);
      expect(progress.totalPagesRead).toBe(10);
      expect(progress.booksGoalMet).toBe(false);
      expect(progress.bibleGoalChapters).toBe(3);
      expect(progress.bibleChaptersRead).toBe(1);
      expect(progress.bibleGoalMet).toBe(false);
      expect(progress.pendingBooks).toHaveLength(1);
    });

    it("marks all goals as met when completed", () => {
      const books = [makeBook({ daily_goal: 20, pages_read_today: 20 })];
      const goal = makeBibleGoal({ daily_chapters: 3 });
      const stats = makeStats({ bible_chapters_read: 3 });

      const progress = NotificationHistoryService.calculateProgress(books, goal, stats);

      expect(progress.booksGoalMet).toBe(true);
      expect(progress.bibleGoalMet).toBe(true);
      expect(progress.pendingBooks).toHaveLength(0);
    });

    it("handles null bible goal", () => {
      const books = [makeBook()];
      const progress = NotificationHistoryService.calculateProgress(books, null, null);

      expect(progress.bibleGoalChapters).toBe(0);
      expect(progress.bibleGoalMet).toBe(true); // 0 goal = always met
    });

    it("handles multiple books", () => {
      const books = [
        makeBook({ daily_goal: 20, pages_read_today: 20 }),
        makeBook({ daily_goal: 30, pages_read_today: 15 }),
      ];

      const progress = NotificationHistoryService.calculateProgress(books, null, null);

      expect(progress.totalPagesGoal).toBe(50);
      expect(progress.totalPagesRead).toBe(35);
      expect(progress.pendingBooks).toHaveLength(1);
    });
  });

  describe("buildDailyPushPayload", () => {
    it("returns completion payload when all goals met", () => {
      const progress = {
        totalPagesGoal: 20, totalPagesRead: 20, booksGoalMet: true,
        bibleGoalChapters: 3, bibleChaptersRead: 3, bibleGoalMet: true,
        pendingBooks: [], allBooks: [],
      };
      const payload = NotificationHistoryService.buildDailyPushPayload(progress);
      expect(payload.title).toContain("Metas cumpridas");
    });

    it("returns pending payload when goals not met", () => {
      const progress = {
        totalPagesGoal: 20, totalPagesRead: 10, booksGoalMet: false,
        bibleGoalChapters: 3, bibleChaptersRead: 1, bibleGoalMet: false,
        pendingBooks: [], allBooks: [],
      };
      const payload = NotificationHistoryService.buildDailyPushPayload(progress);
      expect(payload.title).toContain("Metas pendentes");
      expect(payload.tag).toBe("disciplina-reminder");
    });
  });

  describe("buildDailyTelegramMessage", () => {
    it("builds morning message when isMorning=true", async () => {
      const progress = {
        totalPagesGoal: 20, totalPagesRead: 0, booksGoalMet: false,
        bibleGoalChapters: 3, bibleChaptersRead: 0, bibleGoalMet: false,
        pendingBooks: [], allBooks: [makeBook()],
      };
      const msg = await NotificationHistoryService.buildDailyTelegramMessage(progress, true, 7);
      expect(msg).toContain("Bom dia");
      expect(msg).toContain("Test Book");
    });

    it("builds completion message when all goals met", async () => {
      const progress = {
        totalPagesGoal: 20, totalPagesRead: 20, booksGoalMet: true,
        bibleGoalChapters: 3, bibleChaptersRead: 3, bibleGoalMet: true,
        pendingBooks: [], allBooks: [],
      };
      const msg = await NotificationHistoryService.buildDailyTelegramMessage(progress, false, 15);
      expect(msg).toContain("Parabéns");
    });

    it("builds reminder message when goals pending", async () => {
      const progress = {
        totalPagesGoal: 20, totalPagesRead: 10, booksGoalMet: false,
        bibleGoalChapters: 3, bibleChaptersRead: 1, bibleGoalMet: false,
        pendingBooks: [makeBook()], allBooks: [makeBook()],
      };
      const msg = await NotificationHistoryService.buildDailyTelegramMessage(progress, false, 15);
      expect(msg).toContain("Lembrete");
    });
  });

  describe("buildWeeklyTelegramMessage", () => {
    it("includes all weekly stats", () => {
      const msg = NotificationHistoryService.buildWeeklyTelegramMessage({
        totalPages: 150,
        booksFinished: 2,
        totalChapters: 15,
        totalPomodoros: 10,
        totalFocusMin: 250,
        daysCompleted: 5,
        streak: 12,
        rating: "🌟🌟",
        activeBooks: [{ title: "Book A", progress: 75 }],
      });
      expect(msg).toContain("150");
      expect(msg).toContain("Páginas lidas");
      expect(msg).toContain("12 dias");
      expect(msg).toContain("75%");
    });
  });

  describe("buildWeeklyPushPayload", () => {
    it("builds push payload with weekly summary", () => {
      const payload = NotificationHistoryService.buildWeeklyPushPayload({
        daysCompleted: 5,
        totalPages: 100,
        streak: 10,
      });
      expect(payload.title).toContain("Relatório Semanal");
      expect(payload.body).toContain("5/7");
    });
  });

  describe("getWeeklyRating", () => {
    it("returns 3 stars for 6+ days", () => {
      expect(NotificationHistoryService.getWeeklyRating(6)).toBe("🌟🌟🌟");
    });
    it("returns 2 stars for 4-5 days", () => {
      expect(NotificationHistoryService.getWeeklyRating(4)).toBe("🌟🌟");
    });
    it("returns 1 star for 2-3 days", () => {
      expect(NotificationHistoryService.getWeeklyRating(2)).toBe("🌟");
    });
    it("returns encouragement for 0-1 days", () => {
      expect(NotificationHistoryService.getWeeklyRating(1)).toContain("continue firme");
    });
  });

  describe("calculateStreak", () => {
    it("counts consecutive completed days from start", () => {
      const stats = [
        { goals_completed: true },
        { goals_completed: true },
        { goals_completed: true },
        { goals_completed: false },
        { goals_completed: true },
      ];
      expect(NotificationHistoryService.calculateStreak(stats)).toBe(3);
    });

    it("returns 0 when first day is not completed", () => {
      const stats = [{ goals_completed: false }, { goals_completed: true }];
      expect(NotificationHistoryService.calculateStreak(stats)).toBe(0);
    });

    it("returns 0 for empty array", () => {
      expect(NotificationHistoryService.calculateStreak([])).toBe(0);
    });
  });
});
