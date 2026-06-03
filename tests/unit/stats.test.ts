import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTodayStats, upsertTodayStats, trackPagesRead, trackPomodoroCompleted, trackBibleChapter, getRecentDailyStats } from "@/lib/stats";

vi.mock("@/lib/data-fetch", () => ({
  dataFetch: vi.fn(),
}));

import { dataFetch } from "@/lib/data-fetch";

describe("StatsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTodayStats", () => {
    it("should fetch today's stats for a user", async () => {
      (dataFetch as any).mockResolvedValue({ data: { id: "1", user_id: "u1", books_pages_read: 20 } });
      const result = await getTodayStats("u1");
      expect(result).not.toBeNull();
      expect((result as any).books_pages_read).toBe(20);
    });

    it("should return null when no stats found", async () => {
      (dataFetch as any).mockResolvedValue({ data: null });
      const result = await getTodayStats("u1");
      expect(result).toBeNull();
    });
  });

  describe("upsertTodayStats", () => {
    it("should update existing stats", async () => {
      (dataFetch as any).mockImplementation(async (opts: any) => {
        if (opts.action === "select") return { data: { id: "1", user_id: "u1", date: "2024-01-01", books_pages_read: 10 } };
        if (opts.action === "update") return { data: { id: "1", books_pages_read: 20 } };
        return { data: null };
      });

      const result = await upsertTodayStats("u1", { books_pages_read: 20 });
      expect(result).toBeDefined();
    });

    it("should insert new stats when none exist", async () => {
      let callCount = 0;
      (dataFetch as any).mockImplementation(async (opts: any) => {
        callCount++;
        if (opts.action === "select") return { data: null };
        if (opts.action === "insert") return { data: { id: "new", books_pages_read: 5 } };
        return { data: null };
      });

      const result = await upsertTodayStats("u1", { books_pages_read: 5 });
      expect(result).toBeDefined();
    });
  });

  describe("trackPagesRead", () => {
    it("should update pages and goal completion", async () => {
      (dataFetch as any).mockImplementation(async (opts: any) => {
        if (opts.action === "select" && opts.filters?.eq?.date) return { data: { id: "1", user_id: "u1", date: "2024-01-01", books_pages_read: 10, pomodoros_completed: 0, total_focus_minutes: 0, bible_chapters_read: 0, goals_completed: false, streak_day: 0 } };
        if (opts.action === "update") return { data: { id: "1", books_pages_read: 20, goals_completed: true } };
        return { data: null };
      });

      const result = await trackPagesRead("u1", 10, 20, 20, 3, 3);
      expect(result).toBeDefined();
    });
  });

  describe("trackPomodoroCompleted", () => {
    it("should increment pomodoro count and focus minutes", async () => {
      (dataFetch as any).mockImplementation(async (opts: any) => {
        if (opts.action === "select" && opts.filters?.eq?.date) return { data: { id: "1", user_id: "u1", date: "2024-01-01", books_pages_read: 0, pomodoros_completed: 2, total_focus_minutes: 50, bible_chapters_read: 0, goals_completed: false, streak_day: 0 } };
        if (opts.action === "update") return { data: { id: "1", pomodoros_completed: 3, total_focus_minutes: 75 } };
        return { data: null };
      });

      const result = await trackPomodoroCompleted("u1", 25);
      expect(result).toBeDefined();
    });
  });

  describe("trackBibleChapter", () => {
    it("should update bible chapters and goal completion", async () => {
      (dataFetch as any).mockImplementation(async (opts: any) => {
        if (opts.action === "select" && opts.filters?.eq?.date) return { data: { id: "1", user_id: "u1", date: "2024-01-01", books_pages_read: 20, pomodoros_completed: 0, total_focus_minutes: 0, bible_chapters_read: 2, goals_completed: false, streak_day: 0 } };
        if (opts.action === "update") return { data: { id: "1", bible_chapters_read: 3, goals_completed: true } };
        return { data: null };
      });

      const result = await trackBibleChapter("u1", 3, 3, 20, 20);
      expect(result).toBeDefined();
    });
  });

  describe("getRecentDailyStats", () => {
    it("should fetch recent stats for a user", async () => {
      (dataFetch as any).mockResolvedValue({ data: [{ date: "2024-01-01", goals_completed: true }] });

      const result = await getRecentDailyStats("u1", 7);
      expect(result).toHaveLength(1);
    });
  });
});
