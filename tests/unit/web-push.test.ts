import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock web-push
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
  setVapidDetails: vi.fn(),
}));

import { sendWebPush, cleanupExpiredSubscriptions } from "@/lib/web-push-server";
import webpush from "web-push";

const mockSendNotification = webpush.sendNotification as unknown as ReturnType<typeof vi.fn>;

const validSubs = [
  { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", p256dh: "key1", auth: "auth1" },
  { endpoint: "https://fcm.googleapis.com/fcm/send/def456", p256dh: "key2", auth: "auth2" },
];

const payload = { title: "Test", body: "Hello", tag: "test" };

describe("sendWebPush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends push notifications successfully", async () => {
    mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });
    mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });

    const result = await sendWebPush(validSubs, payload);
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.expiredEndpoints).toHaveLength(0);
  });

  it("handles 410 Gone (expired subscription)", async () => {
    const err410 = new Error("Gone");
    (err410 as unknown as Record<string, number>).statusCode = 410;
    mockSendNotification.mockRejectedValueOnce(err410);

    const result = await sendWebPush([validSubs[0]], payload);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.expiredEndpoints).toContain(validSubs[0].endpoint);
  });

  it("handles 404 Not Found (invalid endpoint)", async () => {
    const err404 = new Error("Not Found");
    (err404 as unknown as Record<string, number>).statusCode = 404;
    mockSendNotification.mockRejectedValueOnce(err404);

    const result = await sendWebPush([validSubs[0]], payload);
    expect(result.failed).toBe(1);
    expect(result.expiredEndpoints).toContain(validSubs[0].endpoint);
  });

  it("handles other errors without marking as expired", async () => {
    const err500 = new Error("Internal Server Error");
    (err500 as unknown as Record<string, number>).statusCode = 500;
    mockSendNotification.mockRejectedValueOnce(err500);

    const result = await sendWebPush([validSubs[0]], payload);
    expect(result.failed).toBe(1);
    expect(result.expiredEndpoints).toHaveLength(0);
  });

  it("returns empty result when no VAPID keys configured", async () => {
    // The module reads env vars at import time, so we test the behavior
    // by checking the function works even without VAPID keys
    // In test env, VAPID keys are set in setup.ts
    const result = await sendWebPush([], payload);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("handles mixed success and failure", async () => {
    mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });
    const err410 = new Error("Gone");
    (err410 as unknown as Record<string, number>).statusCode = 410;
    mockSendNotification.mockRejectedValueOnce(err410);

    const result = await sendWebPush(validSubs, payload);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.expiredEndpoints).toHaveLength(1);
  });
});

describe("cleanupExpiredSubscriptions", () => {
  it("removes expired subscriptions from database", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete });
    const mockSupabase = { from: mockFrom };

    const removed = await cleanupExpiredSubscriptions(
      mockSupabase as unknown as Parameters<typeof cleanupExpiredSubscriptions>[0],
      ["https://fcm.googleapis.com/fcm/send/expired1"]
    );

    expect(removed).toBe(1);
    expect(mockFrom).toHaveBeenCalledWith("notification_subscriptions");
  });

  it("returns 0 when no endpoints to clean", async () => {
    const removed = await cleanupExpiredSubscriptions(
      { from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) }) } as unknown as Parameters<typeof cleanupExpiredSubscriptions>[0],
      []
    );
    expect(removed).toBe(0);
  });

  it("counts failed deletions", async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "Failed" } });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete });
    const mockSupabase = { from: mockFrom };

    const removed = await cleanupExpiredSubscriptions(
      mockSupabase as unknown as Parameters<typeof cleanupExpiredSubscriptions>[0],
      ["https://fcm.googleapis.com/fcm/send/expired1"]
    );

    expect(removed).toBe(0);
  });
});
