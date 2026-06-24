import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ error: null }),
    }),
    auth: {
      getUser: vi.fn().mockReturnValue({ data: { user: { id: "user-1" } }, error: null }),
      admin: { updateUserById: vi.fn().mockReturnValue({ error: null }) },
    },
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(true),
}));

import { POST as confirmHandler } from "@/app/api/auth/confirm/route";

describe("Integration: /api/auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects request without userId", async () => {
    const req = new Request("https://test.com/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-cron-secret" },
      body: JSON.stringify({}),
    });
    const res = await confirmHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("rejects invalid JSON body", async () => {
    const req = new Request("https://test.com/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-cron-secret" },
      body: "invalid json{{{",
    });
    const res = await confirmHandler(req as any);
    expect(res.status).toBe(400);
  });

  it("accepts valid confirm request with CRON_SECRET", async () => {
    const req = new Request("https://test.com/api/auth/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-cron-secret" },
      body: JSON.stringify({ userId: "abc-123" }),
    });
    const res = await confirmHandler(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
