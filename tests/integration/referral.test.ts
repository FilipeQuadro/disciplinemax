import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetReferralCode: vi.fn(),
  mockTrackReferral: vi.fn(),
  mockGetReferralCount: vi.fn(),
}));

vi.mock("@/lib/services/referral-service", () => ({
  ReferralService: class {
    getReferralCode = mocks.mockGetReferralCode;
    trackReferral = mocks.mockTrackReferral;
    getReferralCount = mocks.mockGetReferralCount;
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getAuthUserId: vi.fn().mockResolvedValue("u1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "@/app/api/referral/route";

describe("POST /api/referral", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns 400 on invalid input", async () => {
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it("get_code — returns code and count", async () => {
    mocks.mockGetReferralCode.mockResolvedValueOnce("ABC123");
    mocks.mockGetReferralCount.mockResolvedValueOnce(3);
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "get_code" }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.referralCode).toBe("ABC123");
    expect(body.referralCount).toBe(3);
  });

  it("track — 400 when code missing", async () => {
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "track" }),
    }));
    expect(res.status).toBe(400);
  });

  it("track — 400 on invalid/duplicate referral", async () => {
    mocks.mockTrackReferral.mockResolvedValueOnce(null);
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "track", code: "ABC" }),
    }));
    expect(res.status).toBe(400);
  });

  it("track — 200 on success", async () => {
    mocks.mockTrackReferral.mockResolvedValueOnce({ id: "r1", referral_code: "ABC" });
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "track", code: "ABC" }),
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).referral).toEqual({ id: "r1", referral_code: "ABC" });
  });

  it("returns 400 on invalid action", async () => {
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "hack" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mocks.mockGetReferralCode.mockRejectedValueOnce(new Error("fail"));
    const res = await POST(new Request("https://test.com/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      body: JSON.stringify({ userId: "u1", action: "get_code" }),
    }));
    expect(res.status).toBe(500);
  });
});
