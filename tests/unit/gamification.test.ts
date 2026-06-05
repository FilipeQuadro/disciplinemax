import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useStore
vi.mock("@/store/useStore", () => ({
  useStore: {
    getState: vi.fn().mockReturnValue({
      userId: "test-user-1",
      setTotalXp: vi.fn(),
      setCurrentLevel: vi.fn(),
    }),
  },
}));

import { processGamification } from "@/lib/gamification";

describe("processGamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no userId", async () => {
    const { useStore } = await import("@/store/useStore");
    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      userId: null,
      setTotalXp: vi.fn(),
      setCurrentLevel: vi.fn(),
    });

    const result = await processGamification("page_read", { pages: 5 });
    expect(result).toBeNull();
  });

  it("calls /api/gamification with correct payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        xp: { total: 100, level: 2, xpGained: 10, xpToNext: 300, levelProgress: 33 },
        newAchievements: [],
        challengeUpdates: [],
        streak: null,
      }),
    });

    const result = await processGamification("pomodoro_completed");
    expect(mockFetch).toHaveBeenCalledWith("/api/gamification", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.action).toBe("pomodoro_completed");
    expect(body.userId).toBe("test-user-1");
  });

  it("updates store with XP data on success", async () => {
    const mockSetTotalXp = vi.fn();
    const mockSetCurrentLevel = vi.fn();
    const { useStore } = await import("@/store/useStore");
    (useStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      userId: "test-user-1",
      setTotalXp: mockSetTotalXp,
      setCurrentLevel: mockSetCurrentLevel,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        xp: { total: 150, level: 2, xpGained: 10, xpToNext: 250, levelProgress: 50 },
        newAchievements: ["streak_3"],
        challengeUpdates: [],
        streak: { current: 3, longest: 5 },
      }),
    });

    const result = await processGamification("page_read", { pages: 5 });
    expect(result).toBeTruthy();
    expect(mockSetTotalXp).toHaveBeenCalledWith(150);
    expect(mockSetCurrentLevel).toHaveBeenCalledWith(2);
  });

  it("returns null on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const result = await processGamification("bible_chapter");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await processGamification("book_finished");
    expect(result).toBeNull();
  });

  it("passes page count in data for page_read action", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        xp: { total: 20, level: 1, xpGained: 20, xpToNext: 80, levelProgress: 20 },
        newAchievements: [],
        challengeUpdates: [],
        streak: null,
      }),
    });

    await processGamification("page_read", { pages: 10 });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data.pages).toBe(10);
  });

  it("passes bookId in data for book_finished action", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        xp: { total: 100, level: 2, xpGained: 100, xpToNext: 300, levelProgress: 0 },
        newAchievements: [],
        challengeUpdates: [],
        streak: null,
      }),
    });

    await processGamification("book_finished", { bookId: "book-1" });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.data.bookId).toBe("book-1");
  });
});
