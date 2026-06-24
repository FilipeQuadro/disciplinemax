import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [{ user_id: "u1" }], error: null }),
      }),
    }),
  })),
}));

import { GET as readyHandler } from "@/app/api/ready/route";

describe("GET /api/ready", () => {
  it("returns 200 when database is reachable", async () => {
    const res = await readyHandler();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
