import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

export interface NotificationQueueEntry {
  id: string;
  user_id: string;
  channel: "telegram" | "push";
  payload: Record<string, unknown>;
  status: "pending" | "retrying" | "dead_letter";
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export class NotificationQueueRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  /**
   * Enqueue a failed notification for retry.
   */
  async enqueue(
    userId: string,
    channel: "telegram" | "push",
    payload: Record<string, unknown>,
    maxAttempts = 4
  ): Promise<NotificationQueueEntry | null> {
    return MetricsService.measure("queue_enqueue", async () => {
      const { data, error } = await this.client
        .from("notification_queue")
        .insert({
          user_id: userId,
          channel,
          payload,
          status: "pending",
          attempts: 0,
          max_attempts: maxAttempts,
          next_retry_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error("Failed to enqueue notification", { userId, channel, error: error.message });
        return null;
      }

      return data as NotificationQueueEntry;
    }, { channel });
  }

  /**
   * Fetch notifications ready for retry (status pending/retrying, next_retry_at <= now).
   */
  async fetchReadyForRetry(limit = 100): Promise<NotificationQueueEntry[]> {
    return MetricsService.measure("queue_fetchReady", async () => {
      const { data, error } = await this.client
        .from("notification_queue")
        .select("*")
        .in("status", ["pending", "retrying"])
        .lte("next_retry_at", new Date().toISOString())
        .order("next_retry_at", { ascending: true })
        .limit(limit);

      if (error) {
        logger.error("Failed to fetch retry queue", { error: error.message });
        return [];
      }

      return (data as NotificationQueueEntry[]) ?? [];
    });
  }

  /**
   * Mark a notification as successfully delivered (remove from queue).
   */
  async markDelivered(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("notification_queue")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Failed to mark delivered", { id, error: error.message });
      return false;
    }

    return true;
  }

  /**
   * Mark a notification as failed and schedule next retry.
   * Returns the updated entry, or null if moved to dead_letter.
   */
  async markFailed(id: string, errorMsg: string): Promise<NotificationQueueEntry | null> {
    // First, get current attempts
    const { data: current } = await this.client
      .from("notification_queue")
      .select("attempts, max_attempts")
      .eq("id", id)
      .single();

    if (!current) return null;

    const newAttempts = current.attempts + 1;

    // If exceeded max attempts, move to dead_letter
    if (newAttempts >= current.max_attempts) {
      const { data, error } = await this.client
        .from("notification_queue")
        .update({
          status: "dead_letter",
          attempts: newAttempts,
          last_error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        logger.error("Failed to move to dead_letter", { id, error: error.message });
        return null;
      }

      logger.warn("Notification moved to dead_letter", { id, attempts: newAttempts, error: errorMsg });
      MetricsService.increment("notification_dead_letter", { channel: "unknown" });
      return data as NotificationQueueEntry;
    }

    // Calculate next retry with exponential backoff
    const delayMs = RetryService.getRetryDelay(newAttempts);
    const nextRetry = new Date(Date.now() + delayMs).toISOString();

    const { data, error } = await this.client
      .from("notification_queue")
      .update({
        status: "retrying",
        attempts: newAttempts,
        last_error: errorMsg,
        next_retry_at: nextRetry,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Failed to mark retry", { id, error: error.message });
      return null;
    }

    logger.info("Notification scheduled for retry", { id, attempts: newAttempts, nextRetry });
    return data as NotificationQueueEntry;
  }

  /**
   * Get dead-letter count for monitoring.
   */
  async getDeadLetterCount(): Promise<number> {
    const { count, error } = await this.client
      .from("notification_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "dead_letter");

    if (error) return 0;
    return count ?? 0;
  }

  /**
   * Get queue statistics.
   */
  async getQueueStats(): Promise<{ pending: number; retrying: number; dead_letter: number }> {
    const [pending, retrying, dead_letter] = await Promise.all([
      this.client.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      this.client.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "retrying"),
      this.client.from("notification_queue").select("*", { count: "exact", head: true }).eq("status", "dead_letter"),
    ]);

    return {
      pending: pending.count ?? 0,
      retrying: retrying.count ?? 0,
      dead_letter: dead_letter.count ?? 0,
    };
  }

  /**
   * Cleanup old dead-letter entries (older than 30 days).
   */
  async cleanupOld(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await this.client
      .from("notification_queue")
      .delete({ count: "exact" })
      .eq("status", "dead_letter")
      .lt("updated_at", thirtyDaysAgo);

    if (error) {
      logger.error("Failed to cleanup queue", { error: error.message });
      return 0;
    }

    return count ?? 0;
  }
}

/**
 * Retry service with exponential backoff.
 * Attempt 1 → immediate
 * Attempt 2 → +5 min
 * Attempt 3 → +15 min
 * Attempt 4 → +60 min
 * After limit → dead_letter
 */
export class RetryService {
  private static RETRY_DELAYS = [
    0,            // attempt 1: immediate
    5 * 60_000,   // attempt 2: +5 min
    15 * 60_000,  // attempt 3: +15 min
    60 * 60_000,  // attempt 4: +60 min
  ];

  /**
   * Get the delay in ms before the next retry for a given attempt number.
   */
  static getRetryDelay(attemptNumber: number): number {
    const idx = Math.min(attemptNumber - 1, this.RETRY_DELAYS.length - 1);
    return this.RETRY_DELAYS[idx] ?? 60 * 60_000;
  }

  /**
   * Process all pending retries from the queue.
   * Called by the cron job.
   */
  static async processRetries(
    queueRepo: NotificationQueueRepository,
    deliveryFn: (entry: NotificationQueueEntry) => Promise<boolean>
  ): Promise<{ retried: number; delivered: number; deadLettered: number; failed: number }> {
    const entries = await queueRepo.fetchReadyForRetry();
    let retried = 0;
    let delivered = 0;
    let deadLettered = 0;
    let failed = 0;

    for (const entry of entries) {
      retried++;
      try {
        const ok = await deliveryFn(entry);
        if (ok) {
          await queueRepo.markDelivered(entry.id);
          delivered++;
          MetricsService.increment("notification_retry_success", { channel: entry.channel });
        } else {
          const result = await queueRepo.markFailed(entry.id, "Delivery returned false");
          if (result && result.status === "dead_letter") {
            deadLettered++;
          }
          MetricsService.increment("notification_retry_failed", { channel: entry.channel });
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const result = await queueRepo.markFailed(entry.id, errorMsg);
        if (result && result.status === "dead_letter") {
          deadLettered++;
        }
        failed++;
        MetricsService.increment("notification_retry_error", { channel: entry.channel });
      }
    }

    if (retried > 0) {
      logger.info("Retry batch processed", { retried, delivered, deadLettered, failed });
    }

    return { retried, delivered, deadLettered, failed };
  }
}
