import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetFeed } = vi.hoisted(() => ({
  mockGetFeed: vi.fn(),
}));

vi.mock("@/lib/services/feed-service", () => ({
  FeedService: class { getFeed = mockGetFeed; },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/feed/route";

describe("GET /api/feed", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 when userId is missing", async () => {
    const res = await GET(new Request("https://test.com/api/feed"));
    expect(res.status).toBe(400);
  });

  it("returns feed events for user", async () => {
    mockGetFeed.mockResolvedValueOnce([{ id: "e1" }]);
    const res = await GET(new Request("https://test.com/api/feed?userId=u1"));
    expect(res.status).toBe(200);
    expect((await res.json()).events).toEqual([{ id: "e1" }]);
    expect(mockGetFeed).toHaveBeenCalledWith("u1", 30);
  });

  it("respects custom limit", async () => {
    mockGetFeed.mockResolvedValueOnce([]);
    const res = await GET(new Request("https://test.com/api/feed?userId=u1&limit=10"));
    expect(res.status).toBe(200);
    expect(mockGetFeed).toHaveBeenCalledWith("u1", 10);
  });

  it("caps limit at 100", async () => {
    mockGetFeed.mockResolvedValueOnce([]);
    const res = await GET(new Request("https://test.com/api/feed?userId=u1&limit=500"));
    expect(res.status).toBe(200);
    expect(mockGetFeed).toHaveBeenCalledWith("u1", 100);
  });

  it("returns 500 on error", async () => {
    mockGetFeed.mockRejectedValueOnce(new Error("fail"));
    const res = await GET(new Request("https://test.com/api/feed?userId=u1"));
    expect(res.status).toBe(500);
  });
});
