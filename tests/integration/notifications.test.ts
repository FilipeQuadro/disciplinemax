import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
        limit: vi.fn().mockReturnValue({ data: [], error: null }),
      }),
      upsert: vi.fn().mockReturnValue({ error: null }),
    }),
    auth: {
      getUser: vi.fn().mockReturnValue({ data: { user: { id: "test-user-id" } }, error: null }),
    },
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(false),
  verifyAdmin: vi.fn().mockReturnValue(null),
  verifyAdminOrCron: vi.fn().mockReturnValue({ isAdmin: true, actorId: "cron" }),
}));

import { POST as subscribeHandler } from "@/app/api/notifications/subscribe/route";

describe("Integration: /api/notifications/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const req = new Request("https://test.com/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "web",
        user_id: "test-user-id",
        endpoint: "https://fcm.example.com/abc",
        keys: { p256dh: "key", auth: "auth" },
      }),
    });
    const res = await subscribeHandler(req as any);
    expect(res.status).toBe(401);
  });

  it("rejects invalid request body (missing fields)", async () => {
    const req = new Request("https://test.com/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ platform: "web" }), // missing endpoint, keys, user_id
    });
    const res = await subscribeHandler(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid request body");
  });

  it("rejects web subscription with invalid endpoint", async () => {
    const req = new Request("https://test.com/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        platform: "web",
        user_id: "test-user-id",
        endpoint: "not-a-url",
        keys: { p256dh: "key", auth: "auth" },
      }),
    });
    const res = await subscribeHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects APNS subscription without device_token", async () => {
    const req = new Request("https://test.com/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({
        platform: "apns",
        user_id: "test-user-id",
      }),
    });
    const res = await subscribeHandler(req as any);
    expect(res.status).toBe(400);
  });
});
