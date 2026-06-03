import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock telegram
vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn(),
}));

// Mock web-push-server
vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

vi.mock("@/lib/web-push-server", () => ({
  sendWebPush: vi.fn(),
  cleanupExpiredSubscriptions: vi.fn(),
}));

// Mock repositories
const mockGetWebSubscriptions = vi.fn();
const mockRemoveExpiredSubscriptions = vi.fn();

vi.mock("@/lib/repositories/subscription-repository", () => ({
  SubscriptionRepository: vi.fn().mockImplementation(() => ({
    getWebSubscriptions: mockGetWebSubscriptions,
    removeExpiredSubscriptions: mockRemoveExpiredSubscriptions,
  })),
}));

import { NotificationDeliveryService } from "@/lib/services/notification-delivery-service";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWebPush } from "@/lib/web-push-server";

const mockTg = sendTelegramMessage as unknown as ReturnType<typeof vi.fn>;
const mockPush = sendWebPush as unknown as ReturnType<typeof vi.fn>;

describe("NotificationDeliveryService", () => {
  let service: NotificationDeliveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationDeliveryService({
      getWebSubscriptions: mockGetWebSubscriptions,
      removeExpiredSubscriptions: mockRemoveExpiredSubscriptions,
    } as unknown as import("@/lib/repositories/subscription-repository").SubscriptionRepository);
  });

  describe("sendTelegram", () => {
    it("returns true on successful send", async () => {
      mockTg.mockResolvedValue({ ok: true });
      const result = await service.sendTelegram("token", "chatId", "Hello", "user1");
      expect(result).toBe(true);
    });

    it("returns false on failed send", async () => {
      mockTg.mockResolvedValue({ ok: false, error: "blocked" });
      const result = await service.sendTelegram("token", "chatId", "Hello", "user1");
      expect(result).toBe(false);
    });

    it("returns false on exception", async () => {
      mockTg.mockRejectedValue(new Error("Network error"));
      const result = await service.sendTelegram("token", "chatId", "Hello", "user1");
      expect(result).toBe(false);
    });
  });

  describe("sendPush", () => {
    it("sends push notifications successfully", async () => {
      mockPush.mockResolvedValue({ sent: 2, failed: 0, expiredEndpoints: [] });
      const subs = [
        { endpoint: "https://fcm/1", p256dh: "k1", auth: "a1" },
        { endpoint: "https://fcm/2", p256dh: "k2", auth: "a2" },
      ];
      const result = await service.sendPush("user1", subs, { title: "T", body: "B" });
      expect(result.sent).toBe(2);
      expect(result.expiredEndpoints).toHaveLength(0);
    });

    it("returns empty result when no subscriptions", async () => {
      const result = await service.sendPush("user1", [], { title: "T", body: "B" });
      expect(result.sent).toBe(0);
    });

    it("handles push errors with expired endpoints", async () => {
      mockPush.mockResolvedValue({ sent: 0, failed: 1, expiredEndpoints: ["https://fcm/1"] });
      const subs = [{ endpoint: "https://fcm/1", p256dh: "k1", auth: "a1" }];
      const result = await service.sendPush("user1", subs, { title: "T", body: "B" });
      expect(result.expiredEndpoints).toContain("https://fcm/1");
    });
  });

  describe("sendPushToUser", () => {
    it("fetches subscriptions and sends push", async () => {
      mockGetWebSubscriptions.mockResolvedValue([
        { endpoint: "https://fcm/1", p256dh: "k1", auth: "a1" },
      ]);
      mockPush.mockResolvedValue({ sent: 1, failed: 0, expiredEndpoints: [] });

      const result = await service.sendPushToUser("user1", { title: "T", body: "B" });
      expect(result.sent).toBe(1);
    });

    it("returns empty when no subscriptions", async () => {
      mockGetWebSubscriptions.mockResolvedValue([]);
      const result = await service.sendPushToUser("user1", { title: "T", body: "B" });
      expect(result.sent).toBe(0);
    });

    it("cleans up expired endpoints", async () => {
      mockGetWebSubscriptions.mockResolvedValue([
        { endpoint: "https://fcm/expired", p256dh: "k1", auth: "a1" },
      ]);
      mockPush.mockResolvedValue({ sent: 0, failed: 1, expiredEndpoints: ["https://fcm/expired"] });
      mockRemoveExpiredSubscriptions.mockResolvedValue(1);

      await service.sendPushToUser("user1", { title: "T", body: "B" });
      expect(mockRemoveExpiredSubscriptions).toHaveBeenCalledWith(["https://fcm/expired"]);
    });
  });

  describe("deliverToUser", () => {
    it("delivers to both channels when configured", async () => {
      mockTg.mockResolvedValue({ ok: true });
      mockGetWebSubscriptions.mockResolvedValue([
        { endpoint: "https://fcm/1", p256dh: "k1", auth: "a1" },
      ]);
      mockPush.mockResolvedValue({ sent: 1, failed: 0, expiredEndpoints: [] });

      const result = await service.deliverToUser(
        "user1",
        "Telegram msg",
        { title: "Push", body: "Body" },
        { telegram_bot_token: "tok", telegram_chat_id: "chat" }
      );

      expect(result.telegramSent).toBe(1);
      expect(result.pushSent).toBe(1);
    });

    it("skips telegram when not configured", async () => {
      mockGetWebSubscriptions.mockResolvedValue([]);
      const result = await service.deliverToUser(
        "user1", "msg", { title: "T", body: "B" }, {}
      );
      expect(result.telegramSent).toBe(0);
    });
  });
});
