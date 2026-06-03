import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        limit: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        gt: vi.fn().mockResolvedValue({ data: [], error: null }),
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
      insert: vi.fn().mockReturnValue({ error: null }),
      upsert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    }),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminOrCron: vi.fn().mockReturnValue({ isAdmin: true, actorId: "admin" }),
}));

vi.mock("@/lib/rate-limit", () => ({
  RateLimitService: {
    checkRequest: vi.fn().mockReturnValue(null),
  },
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ ok: true, result: { username: "testbot" } }),
  }),
}));

import { verifyAdminOrCron } from "@/lib/admin-auth";
import { GET as diagnosticsHandler } from "@/app/api/admin/diagnostics/route";

describe("GET /api/admin/diagnostics", () => {
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
    const req = new Request("https://test.com/api/admin/diagnostics");
    const res = await diagnosticsHandler(req);
    expect(res.status).toBe(401);
  });

  it("returns diagnostics for authorized admin", async () => {
    const req = new Request("https://test.com/api/admin/diagnostics");
    const res = await diagnosticsHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("checks");
    expect(body).toHaveProperty("issues");
    expect(body).toHaveProperty("summary");
    expect(body).toHaveProperty("timestamp");
  });

  it("returns at least 5 diagnostic checks", async () => {
    const req = new Request("https://test.com/api/admin/diagnostics");
    const res = await diagnosticsHandler(req);
    const body = await res.json();
    expect(body.checks.length).toBeGreaterThanOrEqual(5);
  });

  it("each check has required fields", async () => {
    const req = new Request("https://test.com/api/admin/diagnostics");
    const res = await diagnosticsHandler(req);
    const body = await res.json();
    for (const check of body.checks) {
      expect(check).toHaveProperty("status");
      expect(check).toHaveProperty("name");
      expect(check).toHaveProperty("description");
      expect(check).toHaveProperty("explanation");
      expect(check).toHaveProperty("suggestion");
      expect(["healthy", "warning", "error", "disabled"]).toContain(check.status);
    }
  });

  it("returns summary with healthy/warnings/errors/disabled counts", async () => {
    const req = new Request("https://test.com/api/admin/diagnostics");
    const res = await diagnosticsHandler(req);
    const body = await res.json();
    expect(body.summary).toHaveProperty("healthy");
    expect(body.summary).toHaveProperty("warnings");
    expect(body.summary).toHaveProperty("errors");
    expect(body.summary).toHaveProperty("disabled");
  });
});
