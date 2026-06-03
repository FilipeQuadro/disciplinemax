import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(true),
}));

import { verifyCronSecret } from "@/lib/admin-auth";
import { GET as migrateHandler } from "@/app/api/migrate/route";

describe("GET /api/migrate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("rejects unauthorized requests", async () => {
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = new Request("https://test.com/api/migrate");
    const res = await migrateHandler(req);
    expect(res.status).toBe(401);
  });

  it("returns migration check result", async () => {
    const req = new Request("https://test.com/api/migrate");
    const res = await migrateHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty("migrations");
  });
});
