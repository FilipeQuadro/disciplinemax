import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{ user_id: "u1" }], error: null }),
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ user_id: "u1" }], error: null }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ sent_at: new Date().toISOString() }], error: null }),
        }),
      }),
    }),
  })),
}));

import { GET as healthHandler } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns basic health without auth", async () => {
    const req = new Request("https://test.com/api/health");
    const res = await healthHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("DisciplinaMax");
  });

  it("returns detailed health with ?detailed", async () => {
    const req = new Request("https://test.com/api/health?detailed");
    const res = await healthHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks).toBeDefined();
    expect(body.checks.database).toBeDefined();
    expect(body.checks.cron).toBeDefined();
  });

  it("returns metrics with ?metrics", async () => {
    const req = new Request("https://test.com/api/health?metrics");
    const res = await healthHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.metrics).toBeDefined();
    expect(body.metrics.uptime_ms).toBeGreaterThan(0);
  });
});
