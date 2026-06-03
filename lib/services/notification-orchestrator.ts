import { NotificationSchedulerService } from "./notification-scheduler-service";
import { NotificationDedupService } from "./notification-dedup-service";
import { NotificationDeliveryService } from "./notification-delivery-service";
import { NotificationHistoryService } from "./notification-history-service";
import { NotificationRepository } from "@/lib/repositories/notification-repository";
import { SubscriptionRepository } from "@/lib/repositories/subscription-repository";
import { logger } from "@/lib/logger";
import type { Book, BibleGoal, DailyStats, UserSettings } from "@/lib/supabase";

export interface OrchestratorDailyResult {
  telegramSent: number;
  pushSent: number;
  skipped: number;
}

export interface OrchestratorWeeklyUserData {
  weekStats: DailyStats[];
  books: Book[];
  bibleReadingsCount: number;
  pomodoros: Array<{ duration_minutes: number }>;
  recentStats: Array<{ goals_completed: boolean }>;
}

/**
 * Central orchestrator for all notification logic.
 * No route should send notifications directly — everything goes through here.
 *
 * Responsibilities:
 * - Decide which channels to use
 * - Apply dedup rules
 * - Build messages
 * - Deliver via channels
 * - Log results
 */
export class NotificationOrchestrator {
  private dedupService: NotificationDedupService;
  private deliveryService: NotificationDeliveryService;

  constructor(
    notificationRepo?: NotificationRepository,
    subscriptionRepo?: SubscriptionRepository
  ) {
    const nRepo = notificationRepo ?? new NotificationRepository();
    const sRepo = subscriptionRepo ?? new SubscriptionRepository();
    this.dedupService = new NotificationDedupService(nRepo);
    this.deliveryService = new NotificationDeliveryService(sRepo);
  }

  /**
   * Process a single user's daily notification.
   * Returns whether the notification was sent or skipped.
   */
  async processDailyNotification(
    settings: UserSettings,
    today: string,
    currentMinutes: number,
    userBooks: Book[],
    bibleGoal: BibleGoal | null,
    stats: DailyStats | null,
    brtHour: number
  ): Promise<"sent" | "skipped"> {
    const userId = settings.user_id;

    // 1. Schedule check
    const schedule = NotificationSchedulerService.checkSchedule(
      currentMinutes,
      settings,
      today
    );
    if (!schedule.shouldSend || !schedule.matchedTime) return "skipped";

    // 2. Dedup (persistent only)
    const notifKey = `${today}_${schedule.matchedTime}`;
    const shouldSend = await this.dedupService.shouldSend(userId, notifKey);
    if (!shouldSend) return "skipped";

    // 3. Build messages
    const progress = NotificationHistoryService.calculateProgress(userBooks, bibleGoal, stats);
    const isMorning = brtHour < 12;

    const telegramMessage = await NotificationHistoryService.buildDailyTelegramMessage(
      progress,
      isMorning,
      brtHour
    );
    const pushPayload = NotificationHistoryService.buildDailyPushPayload(progress);

    // 4. Deliver
    const result = await this.deliveryService.deliverToUser(
      userId,
      telegramMessage,
      pushPayload,
      settings
    );

    logger.info("Daily notification processed", {
      userId,
      matchedTime: schedule.matchedTime,
      telegramSent: result.telegramSent,
      pushSent: result.pushSent,
    });

    return "sent";
  }

  /**
   * Run the daily cron job for all users.
   */
  async runDailyCron(
    allSettings: UserSettings[],
    allBooks: Book[],
    allBibleGoals: BibleGoal[],
    allStats: DailyStats[],
    today: string,
    currentMinutes: number,
    brtHour: number
  ): Promise<OrchestratorDailyResult> {
    let telegramSent = 0;
    let pushSent = 0;
    let skipped = 0;

    // Group data by user_id for O(1) lookup (avoids O(N*M) filter per user)
    const booksByUser = new Map<string, Book[]>();
    for (const b of allBooks) {
      const arr = booksByUser.get(b.user_id) ?? [];
      arr.push(b);
      booksByUser.set(b.user_id, arr);
    }

    const goalsByUser = new Map<string, BibleGoal>();
    for (const g of allBibleGoals) {
      goalsByUser.set(g.user_id, g);
    }

    const statsByUser = new Map<string, DailyStats>();
    for (const s of allStats) {
      statsByUser.set(s.user_id, s);
    }

    for (const settings of allSettings) {
      const userId = settings.user_id;
      const userBooks = booksByUser.get(userId) ?? [];
      const bibleGoal = goalsByUser.get(userId) ?? null;
      const stats = statsByUser.get(userId) ?? null;

      // 1. Schedule check
      const schedule = NotificationSchedulerService.checkSchedule(
        currentMinutes,
        settings,
        today
      );
      if (!schedule.shouldSend || !schedule.matchedTime) { skipped++; continue; }

      // 2. Dedup (persistent only)
      const notifKey = `${today}_${schedule.matchedTime}`;
      const shouldSend = await this.dedupService.shouldSend(userId, notifKey);
      if (!shouldSend) { skipped++; continue; }

      // 3. Build messages
      const progress = NotificationHistoryService.calculateProgress(userBooks, bibleGoal, stats);
      const isMorning = brtHour < 12;

      const telegramMessage = await NotificationHistoryService.buildDailyTelegramMessage(
        progress,
        isMorning,
        brtHour
      );
      const pushPayload = NotificationHistoryService.buildDailyPushPayload(progress);

      // 4. Deliver
      const result = await this.deliveryService.deliverToUser(
        userId,
        telegramMessage,
        pushPayload,
        settings
      );

      telegramSent += result.telegramSent;
      pushSent += result.pushSent;

      logger.info("Daily notification processed", {
        userId,
        matchedTime: schedule.matchedTime,
        telegramSent: result.telegramSent,
        pushSent: result.pushSent,
      });
    }

    return { telegramSent, pushSent, skipped };
  }

  /**
   * Process a single user's weekly notification.
   */
  async processWeeklyNotification(
    settings: UserSettings,
    userData: OrchestratorWeeklyUserData
  ): Promise<{ telegramSent: boolean; pushSent: boolean }> {
    const userId = settings.user_id;

    // Calculate metrics
    const totalPages = userData.weekStats.reduce((s, d) => s + (d.books_pages_read || 0), 0);
    const totalChapters = userData.weekStats.reduce((s, d) => s + (d.bible_chapters_read || 0), 0);
    const totalPomodoros = userData.pomodoros.length;
    const totalFocusMin = userData.pomodoros.reduce((s, p) => s + (p.duration_minutes || 0), 0);
    const daysCompleted = userData.weekStats.filter((d) => d.goals_completed).length;
    const booksFinished = userData.books.filter((b) => b.current_page >= b.total_pages).length;
    const streak = NotificationHistoryService.calculateStreak(userData.recentStats);
    const rating = NotificationHistoryService.getWeeklyRating(daysCompleted);
    const activeBooks = userData.books
      .filter((b) => b.current_page < b.total_pages)
      .map((b) => ({ title: b.title, progress: Math.round((b.current_page / b.total_pages) * 100) }));

    // Build messages
    const telegramMessage = NotificationHistoryService.buildWeeklyTelegramMessage({
      totalPages,
      booksFinished,
      totalChapters,
      totalPomodoros,
      totalFocusMin,
      daysCompleted,
      streak,
      rating,
      activeBooks,
    });

    const pushPayload = NotificationHistoryService.buildWeeklyPushPayload({
      daysCompleted,
      totalPages,
      streak,
    });

    // Deliver
    const result = await this.deliveryService.deliverToUser(
      userId,
      telegramMessage,
      pushPayload,
      settings
    );

    return {
      telegramSent: result.telegramSent > 0,
      pushSent: result.pushSent > 0,
    };
  }
}
