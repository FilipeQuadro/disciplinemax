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

import { POST } from "@/app/api/share/route";

describe("POST /api/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ error: null }) });
  });

  it("returns 400 when userId missing", async () => {
    const res = await POST(new Request("https://test.com/api/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareType: "profile" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when shareType missing", async () => {
    const res = await POST(new Request("https://test.com/api/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns success on valid request", async () => {
    const res = await POST(new Request("https://test.com/api/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", shareType: "profile", data: { username: "filipe" } }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns success even on DB error (best effort)", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn().mockReturnValue({ error: { message: "fail" } }) });
    const res = await POST(new Request("https://test.com/api/share", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "u1", shareType: "streak" }),
    }));
    expect(res.status).toBe(200);
  });
});
