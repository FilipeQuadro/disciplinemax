import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { telegram_bot_token: "tok", telegram_chat_id: "123" }, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ sent_at: new Date().toISOString() }], error: null }),
        }),
        gte: vi.fn().mockReturnValue({
          count: 5,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        count: vi.fn().mockReturnValue({ count: 0, error: null }),
      }),
    }),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminOrCron: vi.fn().mockReturnValue({ isAdmin: true, actorId: "admin" }),
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ ok: true, result: { username: "testbot" } }),
  }),
}));

import { verifyAdminOrCron } from "@/lib/admin-auth";
import { GET as doctorHandler } from "@/app/api/doctor/route";

describe("GET /api/doctor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminOrCron as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAdmin: true,
      actorId: "admin",
    });
  });

  it("rejects unauthorized requests", async () => {
    (verifyAdminOrCron as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      isAdmin: false,
      actorId: null,
    });
    const req = new Request("https://test.com/api/doctor");
    const res = await doctorHandler(req);
    expect(res.status).toBe(401);
  });

  it("returns doctor report for authorized admin", async () => {
    const req = new Request("https://test.com/api/doctor");
    const res = await doctorHandler(req);
    // Doctor returns 200 or 503 based on service health
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty("timestamp");
    expect(body).toHaveProperty("services");
    expect(body).toHaveProperty("issues");
  });

  it("returns services object with health details", async () => {
    const req = new Request("https://test.com/api/doctor");
    const res = await doctorHandler(req);
    const body = await res.json();
    expect(body.services).toHaveProperty("supabase");
    expect(body.services).toHaveProperty("cron");
    expect(body.services.supabase).toHaveProperty("ok");
  });

  it("returns notifications status", async () => {
    const req = new Request("https://test.com/api/doctor");
    const res = await doctorHandler(req);
    const body = await res.json();
    expect(body.notifications).toHaveProperty("telegram");
    expect(body.notifications).toHaveProperty("push");
  });

  it("returns issues array", async () => {
    const req = new Request("https://test.com/api/doctor");
    const res = await doctorHandler(req);
    const body = await res.json();
    expect(Array.isArray(body.issues)).toBe(true);
  });
});
