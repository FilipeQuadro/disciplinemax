import { sendTelegramMessage } from "@/lib/telegram";
import { sendWebPush } from "@/lib/web-push-server";
import { SubscriptionRepository } from "@/lib/repositories/subscription-repository";
import type { PushSubscription } from "@/lib/repositories/subscription-repository";
import { logger } from "@/lib/logger";
import { MetricsService, METRICS } from "@/lib/metrics";

export interface DeliveryResult {
  telegramSent: number;
  pushSent: number;
  telegramErrors: number;
  pushErrors: number;
  expiredEndpoints: string[];
}

/**
 * Handles the actual delivery of notifications through channels.
 * No business logic — just sends and reports results.
 */
export class NotificationDeliveryService {
  private subRepo: SubscriptionRepository;

  constructor(subRepo: SubscriptionRepository) {
    this.subRepo = subRepo;
  }

  /**
   * Send a Telegram message to a user.
   */
  async sendTelegram(
    botToken: string,
    chatId: string,
    message: string,
    userId?: string
  ): Promise<boolean> {
    return MetricsService.measure("delivery_telegram", async () => {
      try {
        const result = await sendTelegramMessage(botToken, chatId, message);
        if (!result.ok) {
          MetricsService.increment(METRICS.TELEGRAM_FAILED, { status: "error" });
          logger.error("Telegram send failed", { userId, error: result.error });
        } else {
          MetricsService.increment(METRICS.TELEGRAM_SENT, { status: "success" });
        }
        return result.ok;
      } catch (e: unknown) {
        MetricsService.increment(METRICS.TELEGRAM_FAILED, { status: "error" });
        logger.error("Telegram send failed", { userId, error: String(e) });
        return false;
      }
    }, { userId: userId ?? "unknown" });
  }

  /**
   * Send Web Push notification to a user's subscriptions.
   */
  async sendPush(
    userId: string,
    subs: PushSubscription[],
    payload: { title: string; body: string; tag?: string }
  ): Promise<{ sent: number; expiredEndpoints: string[] }> {
    if (subs.length === 0) return { sent: 0, expiredEndpoints: [] };

    return MetricsService.measure("delivery_push", async () => {
      try {
        const result = await sendWebPush(subs, payload);
        MetricsService.increment(METRICS.PUSH_SENT, { status: "success" }, result.sent);
        if (result.failed > 0) {
          MetricsService.increment(METRICS.PUSH_FAILED, { status: "error" }, result.failed);
        }
        return { sent: result.sent, expiredEndpoints: result.expiredEndpoints };
      } catch (e: unknown) {
        MetricsService.increment(METRICS.PUSH_FAILED, { status: "error" });
        logger.error("Web Push send failed", { userId, error: String(e) });
        return { sent: 0, expiredEndpoints: [] };
      }
    }, { userId });
  }

  /**
   * Fetch subscriptions and send push notification to a user.
   */
  async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; tag?: string }
  ): Promise<{ sent: number; expiredEndpoints: string[] }> {
    const subs = await this.subRepo.getWebSubscriptions(userId);
    if (subs.length === 0) return { sent: 0, expiredEndpoints: [] };

    const result = await this.sendPush(userId, subs, payload);

    // Clean up expired endpoints
    if (result.expiredEndpoints.length > 0) {
      await this.subRepo.removeExpiredSubscriptions(result.expiredEndpoints);
    }

    return result;
  }

  /**
   * Deliver notification to all configured channels for a user.
   */
  async deliverToUser(
    userId: string,
    telegramMessage: string,
    pushPayload: { title: string; body: string; tag?: string },
    settings: { telegram_bot_token?: string; telegram_chat_id?: string }
  ): Promise<DeliveryResult> {
    const result: DeliveryResult = {
      telegramSent: 0,
      pushSent: 0,
      telegramErrors: 0,
      pushErrors: 0,
      expiredEndpoints: [],
    };

    // Telegram
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      const ok = await this.sendTelegram(
        settings.telegram_bot_token,
        settings.telegram_chat_id,
        telegramMessage,
        userId
      );
      if (ok) result.telegramSent++;
      else result.telegramErrors++;
    }

    // Web Push
    const pushResult = await this.sendPushToUser(userId, pushPayload);
    result.pushSent = pushResult.sent;
    result.expiredEndpoints = pushResult.expiredEndpoints;

    return result;
  }
}
