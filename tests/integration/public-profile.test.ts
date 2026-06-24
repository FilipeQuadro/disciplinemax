import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetPublicProfile } = vi.hoisted(() => ({
  mockGetPublicProfile: vi.fn(),
}));

vi.mock("@/lib/services/profile-service", () => ({
  ProfileService: class {
    getPublicProfile = mockGetPublicProfile;
  },
}));

const { mockGetXp } = vi.hoisted(() => ({
  mockGetXp: vi.fn().mockResolvedValue({ total_xp: 500, current_level: 5 }),
}));

vi.mock("@/lib/repositories/xp-repository", () => ({
  XpRepository: class {
    getXp = mockGetXp;
  },
}));

const { mockGetUnlocked } = vi.hoisted(() => ({
  mockGetUnlocked: vi.fn().mockResolvedValue([
    { achievement_id: "first_book", completed: true },
    { achievement_id: "streak_7", completed: true },
    { achievement_id: "in_progress", completed: false },
  ]),
}));

vi.mock("@/lib/repositories/achievement-repository", () => ({
  AchievementRepository: class {
    getUnlocked = mockGetUnlocked;
  },
}));

const { mockGetStreak } = vi.hoisted(() => ({
  mockGetStreak: vi.fn().mockResolvedValue({ current_streak: 7, longest_streak: 14 }),
}));

vi.mock("@/lib/repositories/streak-repository", () => ({
  StreakRepository: class {
    getStreak = mockGetStreak;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/u/[username]/route";

describe("GET /api/u/[username]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for short username", async () => {
    const req = new Request("https://test.com/api/u/ab");
    const res = await GET(req, { params: Promise.resolve({ username: "ab" }) });
    expect(res.status).toBe(400);
  });

  it("returns 404 when profile not found", async () => {
    mockGetPublicProfile.mockResolvedValueOnce(null);
    const req = new Request("https://test.com/api/u/filipe");
    const res = await GET(req, { params: Promise.resolve({ username: "filipe" }) });
    expect(res.status).toBe(404);
  });

  it("returns public profile with stats", async () => {
    mockGetPublicProfile.mockResolvedValueOnce({
      user_id: "u1", username: "filipe", display_name: "Filipe",
      bio: "Hi", books_completed: 2, total_pages: 100,
      pomodoros_total: 50, bible_chapters_total: 10,
    });
    const req = new Request("https://test.com/api/u/filipe");
    const res = await GET(req, { params: Promise.resolve({ username: "filipe" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.username).toBe("filipe");
    expect(body.profile.xp).toBe(500);
    expect(body.profile.level).toBe(5);
    expect(body.profile.achievements).toEqual(["first_book", "streak_7"]);
    expect(body.profile.currentStreak).toBe(7);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetPublicProfile.mockRejectedValueOnce(new Error("fail"));
    const req = new Request("https://test.com/api/u/filipe");
    const res = await GET(req, { params: Promise.resolve({ username: "filipe" }) });
    expect(res.status).toBe(500);
  });
});
