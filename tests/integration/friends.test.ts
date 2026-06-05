import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockSendRequest: vi.fn(),
  mockAcceptRequest: vi.fn(),
  mockRemoveFriend: vi.fn(),
  mockGetFriends: vi.fn(),
  mockGetPendingRequests: vi.fn(),
}));

vi.mock("@/lib/services/friendship-service", () => ({
  FriendshipService: class {
    sendRequest = mocks.mockSendRequest;
    acceptRequest = mocks.mockAcceptRequest;
    removeFriend = mocks.mockRemoveFriend;
    getFriends = mocks.mockGetFriends;
    getPendingRequests = mocks.mockGetPendingRequests;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "@/app/api/friends/route";

describe("POST /api/friends", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 on invalid input", async () => {
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("send — 400 when targetUserId missing", async () => {
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "send" }),
    }));
    expect(res.status).toBe(400);
  });

  it("send — 409 when request exists", async () => {
    mocks.mockSendRequest.mockResolvedValueOnce(null);
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "send", targetUserId: "u2" }),
    }));
    expect(res.status).toBe(409);
  });

  it("send — 200 on success", async () => {
    mocks.mockSendRequest.mockResolvedValueOnce({ id: "f1", status: "pending" });
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "send", targetUserId: "u2" }),
    }));
    expect(res.status).toBe(200);
  });

  it("accept — 400 when targetUserId missing", async () => {
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "accept" }),
    }));
    expect(res.status).toBe(400);
  });

  it("accept — 404 when no pending request", async () => {
    mocks.mockAcceptRequest.mockResolvedValueOnce(null);
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u2", action: "accept", targetUserId: "u1" }),
    }));
    expect(res.status).toBe(404);
  });

  it("remove — 200 with success", async () => {
    mocks.mockRemoveFriend.mockResolvedValueOnce(true);
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "remove", targetUserId: "u2" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("remove — 400 when targetUserId missing", async () => {
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "remove" }),
    }));
    expect(res.status).toBe(400);
  });

  it("list — returns friends", async () => {
    mocks.mockGetFriends.mockResolvedValueOnce([{ id: "f1" }]);
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).friends).toEqual([{ id: "f1" }]);
  });

  it("list_pending — returns pending", async () => {
    mocks.mockGetPendingRequests.mockResolvedValueOnce([{ id: "f2" }]);
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "list_pending" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).pending).toEqual([{ id: "f2" }]);
  });

  it("returns 400 on invalid action", async () => {
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "hack" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mocks.mockGetFriends.mockRejectedValueOnce(new Error("fail"));
    const res = await POST(new Request("https://test.com/api/friends", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", action: "list" }),
    }));
    expect(res.status).toBe(500);
  });
});
