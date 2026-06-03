import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          limit: vi.fn().mockReturnValue({ data: [], error: null }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
        lt: vi.fn().mockReturnValue({ error: null }),
      }),
      insert: vi.fn().mockReturnValue({ error: null }),
      update: vi.fn().mockReturnValue({
        neq: vi.fn().mockReturnValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({ error: null }),
        eq: vi.fn().mockReturnValue({ error: null }),
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
  cleanupExpiredSubscriptions: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyCronSecret: vi.fn().mockReturnValue(true),
  verifyAdmin: vi.fn().mockReturnValue(null),
  verifyAdminOrCron: vi.fn().mockReturnValue({ isAdmin: true, actorId: "cron" }),
}));

vi.mock("@/lib/fetch-with-timeout", () => ({
  fetchWithTimeout: vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ ok: true }),
  }),
}));

vi.mock("@/lib/ai", () => ({
  getMotivationalMessage: vi.fn().mockResolvedValue("Stay strong!"),
  getBibleVerseOfDay: vi.fn().mockResolvedValue({
    verse: "Test verse",
    reference: "Test 1:1",
  }),
  callOllama: vi.fn().mockResolvedValue(null),
}));

// Import after mocks
import { verifyCronSecret } from "@/lib/admin-auth";
import { GET as cronHandler } from "@/app/api/cron/route";

describe("Integration: /api/cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("rejects unauthorized requests (no CRON_SECRET)", async () => {
    (verifyCronSecret as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const req = new Request("https://test.com/api/cron");
    const res = await cronHandler(req);
    expect(res.status).toBe(401);
  });

  it("accepts authorized requests with Bearer header", async () => {
    const req = new Request("https://test.com/api/cron", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    const res = await cronHandler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("returns telegramSent, pushSent, skipped counts", async () => {
    const req = new Request("https://test.com/api/cron", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    const res = await cronHandler(req);
    const body = await res.json();
    expect(body).toHaveProperty("telegramSent");
    expect(body).toHaveProperty("pushSent");
    expect(body).toHaveProperty("skipped");
    expect(body).toHaveProperty("brtTime");
  });
});
