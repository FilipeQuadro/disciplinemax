import { NotificationSchedulerService } from "./notification-scheduler-service";
import { NotificationDedupService } from "./notification-dedup-service";
import { NotificationDeliveryService } from "./notification-delivery-service";
import { NotificationHistoryService } from "./notification-history-service";
import { NotificationRepository } from "@/lib/repositories/notification-repository";
import { NotificationQueueRepository, RetryService } from "@/lib/repositories/notification-queue-repository";
import { EventTrackingService, EVENT_TYPES } from "@/lib/repositories/event-tracking-repository";
import { SubscriptionRepository } from "@/lib/repositories/subscription-repository";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";
import { ChallengeRepository } from "@/lib/repositories/challenge-repository";
import { logger } from "@/lib/logger";
import { MetricsService } from "@/lib/metrics";
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
  private eventService: EventTrackingService;
  private xpRepo: XpRepository;
  private achievementRepo: AchievementRepository;
  private challengeRepo: ChallengeRepository;

  constructor(
    notificationRepo?: NotificationRepository,
    subscriptionRepo?: SubscriptionRepository,
    xpRepo?: XpRepository,
    achievementRepo?: AchievementRepository,
    challengeRepo?: ChallengeRepository,
  ) {
    const nRepo = notificationRepo ?? new NotificationRepository();
    const sRepo = subscriptionRepo ?? new SubscriptionRepository();
    const qRepo = new NotificationQueueRepository();
    this.dedupService = new NotificationDedupService(nRepo);
    this.deliveryService = new NotificationDeliveryService(sRepo, qRepo);
    this.eventService = new EventTrackingService();
    this.xpRepo = xpRepo ?? new XpRepository();
    this.achievementRepo = achievementRepo ?? new AchievementRepository();
    this.challengeRepo = challengeRepo ?? new ChallengeRepository();
  }

  /**
   * Process a single user's daily notification.
   * Returns send counts and whether it was sent or skipped.
   */
  async processDailyNotification(
    settings: UserSettings,
    today: string,
    currentMinutes: number,
    userBooks: Book[],
    bibleGoal: BibleGoal | null,
    stats: DailyStats | null,
    brtHour: number
  ): Promise<{ status: "sent" | "skipped"; telegramSent: number; pushSent: number }> {
    const userId = settings.user_id;

    // 1. Schedule check
    const schedule = NotificationSchedulerService.checkSchedule(
      currentMinutes,
      settings,
      today
    );
    if (!schedule.shouldSend || !schedule.matchedTime) return { status: "skipped", telegramSent: 0, pushSent: 0 };

    // 2. Dedup (persistent only)
    const notifKey = `${today}_${schedule.matchedTime}`;
    const shouldSend = await this.dedupService.shouldSend(userId, notifKey);
    if (!shouldSend) return { status: "skipped", telegramSent: 0, pushSent: 0 };

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

    // Track event
    this.eventService.track(userId, EVENT_TYPES.NOTIFICATION_SENT, {
      matchedTime: schedule.matchedTime,
      telegramSent: result.telegramSent,
      pushSent: result.pushSent,
      isMorning,
    }).catch(() => { /* best effort */ });

    return { status: "sent", telegramSent: result.telegramSent, pushSent: result.pushSent };
  }

  /**
   * Run the daily cron job for all users.
   * Uses batch processing: processes CHUNK_SIZE users in parallel,
   * then moves to the next batch. This prevents memory/CPU spikes
   * while being significantly faster than sequential processing.
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
    const CHUNK_SIZE = 50;

    // Group data by user_id for O(1) lookup
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

    let telegramSent = 0;
    let pushSent = 0;
    let skipped = 0;

    // Process in chunks for controlled parallelism
    for (let i = 0; i < allSettings.length; i += CHUNK_SIZE) {
      const chunk = allSettings.slice(i, i + CHUNK_SIZE);
      const chunkStart = Date.now();

      const results = await Promise.all(
        chunk.map((settings) =>
          this.processDailyNotification(
            settings,
            today,
            currentMinutes,
            booksByUser.get(settings.user_id) ?? [],
            goalsByUser.get(settings.user_id) ?? null,
            statsByUser.get(settings.user_id) ?? null,
            brtHour
          )
        )
      );

      for (const result of results) {
        if (result.status === "sent") {
          telegramSent += result.telegramSent;
          pushSent += result.pushSent;
        } else {
          skipped++;
        }
      }

      const chunkDuration = Date.now() - chunkStart;
      MetricsService.recordDuration("cron_chunk_duration_ms", chunkDuration, { chunkSize: String(chunk.length) });

      if (allSettings.length > CHUNK_SIZE) {
        logger.info("Cron batch processed", {
          chunk: `${i / CHUNK_SIZE + 1}/${Math.ceil(allSettings.length / CHUNK_SIZE)}`,
          chunkSize: chunk.length,
          duration_ms: chunkDuration,
        });
      }
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

    // Fetch gamification data (XP, level, achievements, challenges)
    let xpData: { xp: number; level: number } | null = null;
    let achievementsUnlocked = 0;
    let challengesCompleted = 0;
    try {
      const [xpRes, achRes, chalRes] = await Promise.all([
        this.xpRepo.getXp(userId),
        this.achievementRepo.getUnlocked(userId),
        this.challengeRepo.getCompleted(userId, 30),
      ]);
      if (xpRes) {
        xpData = { xp: xpRes.total_xp, level: xpRes.current_level };
      }
      // Count achievements unlocked in the last 7 days
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      achievementsUnlocked = achRes.filter((a) => a.unlocked_at && a.unlocked_at >= weekAgo).length;
      // Count challenges completed this week
      const weekKey = `${new Date().getFullYear()}-W${String(Math.ceil(((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000 + new Date(new Date().getFullYear(), 0, 1).getDay() + 1) / 7)).padStart(2, "0")}`;
      challengesCompleted = chalRes.filter((c) => c.week_key === weekKey && c.completed).length;
    } catch (e) {
      logger.error("Failed to fetch gamification data for weekly notification", { error: String(e), userId });
    }

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
      xp: xpData?.xp,
      level: xpData?.level,
      achievementsUnlocked: achievementsUnlocked > 0 ? achievementsUnlocked : undefined,
      challengesCompleted: challengesCompleted > 0 ? challengesCompleted : undefined,
    });

    const pushPayload = NotificationHistoryService.buildWeeklyPushPayload({
      daysCompleted,
      totalPages,
      streak,
      level: xpData?.level,
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
