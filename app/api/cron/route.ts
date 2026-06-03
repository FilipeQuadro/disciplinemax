import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { UserRepository } from "@/lib/repositories/user-repository";
import { NotificationRepository } from "@/lib/repositories/notification-repository";
import { NotificationOrchestrator } from "@/lib/services/notification-orchestrator";
import { NotificationSchedulerService } from "@/lib/services/notification-scheduler-service";
import { MetricsService, METRICS } from "@/lib/metrics";
import { AlertService } from "@/lib/alert";

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronStart = Date.now();

  try {
    // Time calculations
    const currentMinutes = NotificationSchedulerService.getCurrentBrtMinutes();
    const today = NotificationSchedulerService.getTodayBrt();
    const brtHour = Math.floor(currentMinutes / 60);

    // Repositories
    const settingsRepo = new SettingsRepository();
    const userRepo = new UserRepository();
    const notifRepo = new NotificationRepository();

    // Cleanup old notifications (7+ days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await notifRepo.cleanupOld(sevenDaysAgo);

    // Daily reset: reset pages_read_today at midnight BRT
    if (NotificationSchedulerService.isMidnightBrt()) {
      try {
        await userRepo.resetDailyPages();
        logger.info("Daily pages_read_today reset done", { brtHour });
      } catch (e: unknown) {
        logger.error("Daily pages reset error", { error: String(e) });
      }
    }

    // Batch fetch all data (no N+1)
    const [allSettings, allBooks, allBibleGoals, allStats] = await Promise.all([
      settingsRepo.getAllSettings(),
      userRepo.getAllBooks(),
      userRepo.getAllBibleGoals(),
      userRepo.getTodayStats(today),
    ]);

    if (allSettings.length === 0) {
      logger.info("Cron run: no users with settings");
      MetricsService.increment(METRICS.CRON_RUNS, { status: "success" });
      MetricsService.recordDuration(METRICS.CRON_DURATION, Date.now() - cronStart);
      return NextResponse.json({ ok: true, telegramSent: 0, pushSent: 0, skipped: 0, brtTime: `${brtHour}:${currentMinutes - brtHour * 60}` });
    }

    // Orchestrator handles scheduling, dedup, message building, and delivery
    const orchestrator = new NotificationOrchestrator(notifRepo);
    const result = await orchestrator.runDailyCron(
      allSettings,
      allBooks,
      allBibleGoals,
      allStats,
      today,
      currentMinutes,
      brtHour
    );

    const duration = Date.now() - cronStart;
    MetricsService.increment(METRICS.CRON_RUNS, { status: "success" });
    MetricsService.recordDuration(METRICS.CRON_DURATION, duration);
    MetricsService.increment(METRICS.NOTIFICATIONS_SENT, {}, result.telegramSent + result.pushSent);

    logger.info("Cron run completed", {
      ...result,
      brtTime: `${brtHour}:${currentMinutes - brtHour * 60}`,
      userCount: allSettings.length,
      duration_ms: duration,
    });

    // Check alerts after run
    await AlertService.checkAlerts();

    return NextResponse.json({
      ok: true,
      telegramSent: result.telegramSent,
      pushSent: result.pushSent,
      skipped: result.skipped,
      brtTime: `${brtHour}:${currentMinutes - brtHour * 60}`,
      duration_ms: duration,
    });
  } catch (e: unknown) {
    const duration = Date.now() - cronStart;
    MetricsService.increment(METRICS.CRON_RUNS, { status: "error" });
    MetricsService.recordDuration(METRICS.CRON_DURATION, duration);
    MetricsService.increment(METRICS.NOTIFICATIONS_FAILED);
    logger.error("Cron run failed", { error: String(e), duration_ms: duration });

    await AlertService.fireAlert("Cron Failure", `Cron run failed: ${e instanceof Error ? e.message : String(e)}`, "telegram");

    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
