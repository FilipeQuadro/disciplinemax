import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  RateLimitService: {
    checkRequest: vi.fn().mockReturnValue(null),
    extractIp: vi.fn().mockReturnValue("127.0.0.1"),
  },
}));

vi.mock("@/lib/logger", () => ({
  initRequestId: vi.fn(),
}));

const ORIGINAL_ENV = process.env;

describe("Integration: /api/auth/guest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns guest credentials when env vars are set", async () => {
    process.env.GUEST_EMAIL = "guest@example.com";
    process.env.GUEST_PASSWORD = "guestpass123";

    const { POST } = await import("@/app/api/auth/guest/route");
    const req = new Request("https://test.com/api/auth/guest", { method: "POST" });
    const res = await POST(req as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("guest@example.com");
    expect(body.password).toBe("guestpass123");
  });

  it("returns 503 when GUEST_EMAIL is missing", async () => {
    delete process.env.GUEST_EMAIL;
    process.env.GUEST_PASSWORD = "guestpass123";

    const { POST } = await import("@/app/api/auth/guest/route");
    const req = new Request("https://test.com/api/auth/guest", { method: "POST" });
    const res = await POST(req as any);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Guest mode not configured");
  });

  it("returns 503 when GUEST_PASSWORD is missing", async () => {
    process.env.GUEST_EMAIL = "guest@example.com";
    delete process.env.GUEST_PASSWORD;

    const { POST } = await import("@/app/api/auth/guest/route");
    const req = new Request("https://test.com/api/auth/guest", { method: "POST" });
    const res = await POST(req as any);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("Guest mode not configured");
  });

  it("returns 429 when rate limited", async () => {
    const { RateLimitService } = await import("@/lib/rate-limit");
    (RateLimitService.checkRequest as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 })
    );

    const { POST } = await import("@/app/api/auth/guest/route");
    const req = new Request("https://test.com/api/auth/guest", { method: "POST" });
    const res = await POST(req as any);

    expect(res.status).toBe(429);
  });
});
