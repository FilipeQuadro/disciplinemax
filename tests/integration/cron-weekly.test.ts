import { describe, it, expect, vi, beforeEach } from "vitest";

// Full chain mock for Supabase client
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ error: null }),
      upsert: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      delete: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({ error: null }),
        eq: vi.fn().mockReturnValue({ error: null }),
      }),
      update: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({ error: null }),
      }),
    }),
    auth: {
      admin: { listUsers: vi.fn().mockReturnValue({ data: { users: [] }, error: null }) },
    },
  })),
}));

vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

vi.mock("@/lib/web-push-server", () => ({
  sendWebPush: vi.fn().mockResolvedValue({ sent: 0, failed: 0, expiredEndpoints: [] }),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(true),
}));

import { verifyCronSecret } from "@/lib/admin-auth";
import { GET as weeklyCronHandler } from "@/app/api/cron/weekly/route";

describe("Integration: /api/cron/weekly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("rejects unauthorized requests", async () => {
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = new Request("https://test.com/api/cron/weekly");
    const res = await weeklyCronHandler(req);
    expect(res.status).toBe(401);
  });

  it("accepts authorized requests", async () => {
    const req = new Request("https://test.com/api/cron/weekly");
    const res = await weeklyCronHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns telegramSent and pushSent counts", async () => {
    const req = new Request("https://test.com/api/cron/weekly");
    const res = await weeklyCronHandler(req);
    const body = await res.json();
    expect(body).toHaveProperty("telegramSent");
    expect(body).toHaveProperty("pushSent");
    expect(body).toHaveProperty("date");
  });
});
