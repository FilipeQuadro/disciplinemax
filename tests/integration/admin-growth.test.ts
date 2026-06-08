import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/db-client", () => ({
  getServiceClient: vi.fn().mockImplementation(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminOrCron: vi.fn().mockResolvedValue({ isAdmin: true, actorId: "admin-test" }),
}));

function createFullChain(finalValue: any = { data: [], error: null, count: 0 }) {
  const chain: any = new Proxy(() => {}, {
    get(target, prop) {
      if (prop === "then" || prop === "catch") {
        return (resolve: any) => Promise.resolve(finalValue).then(resolve);
      }
      return (..._args: any[]) => chain;
    },
  });
  return chain;
}

function createAuthRequest(): Request {
  return new Request("http://localhost:3000/api/admin/growth", {
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

import { GET } from "@/app/api/admin/growth/route";

describe("GET /api/admin/growth", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns growth metrics", async () => {
    const countChain = createFullChain({ count: 10, error: null });
    const metricsChain = createFullChain({
      data: [
        { metric_name: "shares_total", value: 1, date: "2024-01-15" },
        { metric_name: "shares_total", value: 1, date: "2024-01-16" },
      ],
      error: null,
    });
    mockFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(countChain)
      .mockReturnValueOnce(countChain).mockReturnValueOnce(metricsChain);

    const res = await GET(createAuthRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toBe("30d");
    expect(body.referrals.count).toBe(10);
    expect(body.metrics.shares_total.total).toBe(2);
  });

  it("handles empty metrics", async () => {
    const countChain = createFullChain({ count: 0, error: null });
    const metricsChain = createFullChain({ data: [], error: null });
    mockFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(countChain)
      .mockReturnValueOnce(countChain).mockReturnValueOnce(metricsChain);

    const res = await GET(createAuthRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).metrics).toEqual({});
  });

  it("returns 500 on error", async () => {
    mockFrom.mockImplementation(() => { throw new Error("fail"); });
    const res = await GET(createAuthRequest());
    expect(res.status).toBe(500);
  });

  it("returns 403 without auth", async () => {
    const { verifyAdminOrCron } = await import("@/lib/admin-auth");
    (verifyAdminOrCron as any).mockResolvedValueOnce({ isAdmin: false, actorId: "" });
    const res = await GET(createAuthRequest());
    expect(res.status).toBe(403);
  });
});
