import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetActiveChallenges: vi.fn(),
  mockGetChallengeProgress: vi.fn(),
  mockContribute: vi.fn(),
}));

vi.mock("@/lib/services/community-event-service", () => ({
  CommunityEventService: class {
    getActiveChallenges = mocks.mockGetActiveChallenges;
    getChallengeProgress = mocks.mockGetChallengeProgress;
    contribute = mocks.mockContribute;
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("u1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET, POST } from "@/app/api/community-events/route";

describe("GET /api/community-events", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns challenges with progress", async () => {
    mocks.mockGetActiveChallenges.mockResolvedValueOnce([{ id: "c1", title: "10K", target_value: 10000 }]);
    mocks.mockGetChallengeProgress.mockResolvedValueOnce({
      totalContribution: 5000, participantCount: 100, targetValue: 10000, progressPct: 50,
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.challenges).toHaveLength(1);
    expect(body.challenges[0].progressPct).toBe(50);
  });

  it("returns 500 on error", async () => {
    mocks.mockGetActiveChallenges.mockRejectedValueOnce(new Error("fail"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe("POST /api/community-events", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 on invalid input", async () => {
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("list — returns challenges", async () => {
    mocks.mockGetActiveChallenges.mockResolvedValueOnce([{ id: "c1" }]);
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).challenges).toHaveLength(1);
  });

  it("contribute — 400 when challengeId missing", async () => {
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "contribute", contribution: 5 }),
    }));
    expect(res.status).toBe(400);
  });

  it("contribute — 400 when contribution missing", async () => {
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "contribute", challengeId: "c1" }),
    }));
    expect(res.status).toBe(400);
  });

  it("contribute — 200 on success", async () => {
    mocks.mockContribute.mockResolvedValueOnce(true);
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "contribute", challengeId: "c1", contribution: 5 }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("contribute — 200 success:false on reject", async () => {
    mocks.mockContribute.mockResolvedValueOnce(false);
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "contribute", challengeId: "c1", contribution: 5 }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(false);
  });

  it("returns 400 on invalid action", async () => {
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "hack" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mocks.mockGetActiveChallenges.mockRejectedValueOnce(new Error("fail"));
    const res = await POST(new Request("https://test.com/api/community-events", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(500);
  });
});
