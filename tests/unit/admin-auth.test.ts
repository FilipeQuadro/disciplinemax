import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { verifyCronSecret, verifyAdmin, verifyAdminOrCron } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";

describe("verifyCronSecret", () => {
  it("returns true for valid Bearer token", () => {
    const req = new Request("https://test.com", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    expect(verifyCronSecret(req)).toBe(true);
  });

  it("returns false for missing Authorization header", () => {
    const req = new Request("https://test.com");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false for wrong token", () => {
    const req = new Request("https://test.com", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false for non-Bearer scheme", () => {
    const req = new Request("https://test.com", {
      headers: { Authorization: "Basic dGVzdDp0ZXN0" },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });
});

describe("verifyAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when Supabase env vars not set", async () => {
    const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const origKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await verifyAdmin(new Request("https://test.com"));
    expect(result).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origKey;
  });

  it("returns null when no Authorization header", async () => {
    const result = await verifyAdmin(new Request("https://test.com"));
    expect(result).toBeNull();
  });

  it("returns null when JWT is invalid", async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null }, error: { message: "Invalid" } });
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    (createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
      auth: { getUser: mockGetUser },
    });

    const req = new Request("https://test.com", {
      headers: { Authorization: "Bearer invalid-jwt" },
    });
    const result = await verifyAdmin(req);
    expect(result).toBeNull();
  });
});

describe("verifyAdminOrCron", () => {
  it("returns admin=true for valid cron secret", async () => {
    const req = new Request("https://test.com", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    const result = await verifyAdminOrCron(req);
    expect(result.isAdmin).toBe(true);
    expect(result.actorId).toBe("cron");
  });

  it("returns admin=false for no auth", async () => {
    const req = new Request("https://test.com");
    const result = await verifyAdminOrCron(req);
    expect(result.isAdmin).toBe(false);
    expect(result.actorId).toBe("");
  });
});
