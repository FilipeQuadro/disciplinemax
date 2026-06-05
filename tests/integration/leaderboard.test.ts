import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetLeaderboard } = vi.hoisted(() => ({
  mockGetLeaderboard: vi.fn(),
}));

vi.mock("@/lib/services/leaderboard-service", () => ({
  LeaderboardService: class { getLeaderboard = mockGetLeaderboard; },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/leaderboard/route";

describe("GET /api/leaderboard", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 on invalid category", async () => {
    const res = await GET(new Request("https://test.com/api/leaderboard?category=invalid"));
    expect(res.status).toBe(400);
  });

  it("returns leaderboard with default category xp", async () => {
    mockGetLeaderboard.mockResolvedValueOnce([{ user_id: "u1", rank: 1 }]);
    const res = await GET(new Request("https://test.com/api/leaderboard"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toEqual([{ user_id: "u1", rank: 1 }]);
    expect(body.category).toBe("xp");
  });

  it("passes custom category and limit", async () => {
    mockGetLeaderboard.mockResolvedValueOnce([]);
    const res = await GET(new Request("https://test.com/api/leaderboard?category=streak&limit=10"));
    expect(res.status).toBe(200);
    expect(mockGetLeaderboard).toHaveBeenCalledWith("streak", 10);
  });

  it("returns 500 on error", async () => {
    mockGetLeaderboard.mockRejectedValueOnce(new Error("fail"));
    const res = await GET(new Request("https://test.com/api/leaderboard?category=xp"));
    expect(res.status).toBe(500);
  });
});
