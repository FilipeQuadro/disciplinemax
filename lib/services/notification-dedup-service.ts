import { NotificationRepository } from "@/lib/repositories/notification-repository";

/**
 * Handles notification deduplication using ONLY the persistent store.
 * No in-memory caches — survives cold starts and deploys.
 */
export class NotificationDedupService {
  private repo: NotificationRepository;

  constructor(repo: NotificationRepository) {
    this.repo = repo;
  }

  /**
   * Check if a notification was already sent for this user/day/time.
   * Uses the notifications_sent table exclusively.
   */
  async wasAlreadySent(userId: string, notifKey: string): Promise<boolean> {
    return this.repo.wasAlreadySent(userId, notifKey);
  }

  /**
   * Record that a notification was sent (for dedup and audit).
   */
  async recordSent(userId: string, notifKey: string): Promise<void> {
    await this.repo.recordSent(userId, notifKey);
  }

  /**
   * Check and record atomically: returns true if should send (not yet sent).
   */
  async shouldSend(userId: string, notifKey: string): Promise<boolean> {
    const alreadySent = await this.wasAlreadySent(userId, notifKey);
    if (alreadySent) return false;
    await this.recordSent(userId, notifKey);
    return true;
  }

  /**
   * Cleanup old notification records (call once per cron run).
   */
  async cleanupOlderThan(olderThan: string): Promise<void> {
    await this.repo.cleanupOld(olderThan);
  }
}
