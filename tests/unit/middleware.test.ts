import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  generateRequestId: vi.fn(() => "test-request-id"),
  initRequestId: vi.fn(),
}));

// Mock next/server — factory must be self-contained (hoisted above class definitions)
vi.mock("next/server", () => {
  class NR extends Response {
    static next() { return new NR(null, { status: 200 }); }
    static json(body: unknown, init?: ResponseInit) {
      return new NR(JSON.stringify(body), {
        headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
        status: init?.status ?? 200,
      });
    }
  }
  return { NextResponse: NR };
});

import { middleware } from "@/middleware";

function createMockRequest(pathname: string, options?: { ip?: string; forwardedFor?: string; requestId?: string }) {
  return {
    nextUrl: { pathname },
    ip: options?.ip ?? null,
    headers: {
      get: (name: string) => {
        if (name === "x-forwarded-for") return options?.forwardedFor ?? null;
        if (name === "x-request-id") return options?.requestId ?? null;
        return null;
      },
    },
  } as any;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through static files (/_next/...)", async () => {
    const req = createMockRequest("/_next/static/chunk.js");
    const res = await middleware(req);
    expect(res).toBeDefined();
  });

  it("passes through favicon requests", async () => {
    const req = createMockRequest("/favicon.ico");
    const res = await middleware(req);
    expect(res).toBeDefined();
  });

  it("passes through files with extensions", async () => {
    const req = createMockRequest("/sw.js");
    const res = await middleware(req);
    expect(res).toBeDefined();
  });

  it("adds security headers to normal pages", async () => {
    const req = createMockRequest("/dashboard");
    const res = await middleware(req);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("adds X-Request-Id header", async () => {
    const req = createMockRequest("/dashboard");
    const res = await middleware(req);
    expect(res.headers.get("X-Request-Id")).toBe("test-request-id");
  });

  it("propagates existing x-request-id header", async () => {
    const req = createMockRequest("/dashboard", { requestId: "custom-id-123" });
    const res = await middleware(req);
    expect(res.headers.get("X-Request-Id")).toBe("custom-id-123");
  });

  it("allows API requests under rate limit", async () => {
    const req = createMockRequest("/api/health");
    const res = await middleware(req);
    expect(res.status).not.toBe(429);
  });

  it("adds security headers to API responses", async () => {
    const req = createMockRequest("/api/health");
    const res = await middleware(req);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("adds Content-Security-Policy header", async () => {
    const req = createMockRequest("/");
    const res = await middleware(req);
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toContain("default-src 'self'");
  });

  it("adds Permissions-Policy header", async () => {
    const req = createMockRequest("/");
    const res = await middleware(req);
    const pp = res.headers.get("Permissions-Policy");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });

  it("rate limits after exceeding max requests from same IP", async () => {
    let lastRes: any;
    for (let i = 0; i < 62; i++) {
      const req = createMockRequest("/api/data", { forwardedFor: "1.2.3.4" });
      lastRes = await middleware(req);
    }
    expect(lastRes.status).toBe(429);
    const body = await lastRes.json();
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("rate limit response includes Retry-After header", async () => {
    for (let i = 0; i < 62; i++) {
      const req = createMockRequest("/api/data", { forwardedFor: "5.6.7.8" });
      await middleware(req);
    }
    const req = createMockRequest("/api/data", { forwardedFor: "5.6.7.8" });
    const res = await middleware(req);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("does not rate limit non-API paths", async () => {
    for (let i = 0; i < 70; i++) {
      const req = createMockRequest("/dashboard");
      await middleware(req);
    }
    const req = createMockRequest("/dashboard");
    const res = await middleware(req);
    expect(res.status).not.toBe(429);
  });
});
