import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockListGroups: vi.fn(),
  mockJoinGroup: vi.fn(),
  mockLeaveGroup: vi.fn(),
  mockGetUserGroups: vi.fn(),
  mockGetGroupRanking: vi.fn(),
}));

vi.mock("@/lib/services/group-service", () => ({
  GroupService: class {
    listGroups = mocks.mockListGroups;
    joinGroup = mocks.mockJoinGroup;
    leaveGroup = mocks.mockLeaveGroup;
    getUserGroups = mocks.mockGetUserGroups;
    getGroupRanking = mocks.mockGetGroupRanking;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "@/app/api/groups/route";

describe("POST /api/groups", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 on invalid input", async () => {
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("list — returns groups with isMember", async () => {
    mocks.mockListGroups.mockResolvedValueOnce([{ id: "g1", name: "A" }, { id: "g2", name: "B" }]);
    mocks.mockGetUserGroups.mockResolvedValueOnce([{ id: "g1", name: "A" }]);
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.groups[0].isMember).toBe(true);
    expect(body.groups[1].isMember).toBe(false);
  });

  it("join — 400 when groupId missing", async () => {
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "join" }),
    }));
    expect(res.status).toBe(400);
  });

  it("join — 200 on success", async () => {
    mocks.mockJoinGroup.mockResolvedValueOnce(true);
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "join", groupId: "g1" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("leave — 400 when groupId missing", async () => {
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "leave" }),
    }));
    expect(res.status).toBe(400);
  });

  it("leave — 200 on success", async () => {
    mocks.mockLeaveGroup.mockResolvedValueOnce(true);
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "leave", groupId: "g1" }),
    }));
    expect(res.status).toBe(200);
  });

  it("ranking — 400 when groupId missing", async () => {
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "ranking" }),
    }));
    expect(res.status).toBe(400);
  });

  it("ranking — returns data", async () => {
    mocks.mockGetGroupRanking.mockResolvedValueOnce([{ user_id: "u1", xp: 500 }]);
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "ranking", groupId: "g1" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).ranking).toEqual([{ user_id: "u1", xp: 500 }]);
  });

  it("returns 400 on invalid action", async () => {
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "hack" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mocks.mockListGroups.mockRejectedValueOnce(new Error("fail"));
    const res = await POST(new Request("https://test.com/api/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(500);
  });
});
