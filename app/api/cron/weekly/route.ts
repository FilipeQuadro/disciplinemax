import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/admin-auth";
import { initRequestId, logger } from "@/lib/logger";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { UserRepository } from "@/lib/repositories/user-repository";
import { NotificationOrchestrator } from "@/lib/services/notification-orchestrator";
import { NotificationHistoryService } from "@/lib/services/notification-history-service";
import { NotificationSchedulerService } from "@/lib/services/notification-scheduler-service";

export async function GET(req: Request) {
  initRequestId(req);

  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const todayStr = NotificationSchedulerService.getTodayBrt();

  // Repositories
  const settingsRepo = new SettingsRepository();
  const userRepo = new UserRepository();

  // Batch fetch all data upfront (eliminates N+1 — was 6 queries/user, now 5 queries total)
  const [allSettings, allBooks, weekStats, pomodoros, recentStats] = await Promise.all([
    settingsRepo.getAllSettings(),
    userRepo.getAllBooks(),
    userRepo.getWeeklyStatsBatch(weekAgoStr, todayStr),
    userRepo.getPomodorosBatch(weekAgoStr),
    userRepo.getRecentStatsBatch(30),
  ]);

  // Group data by user_id for O(1) lookup
  const booksByUser = new Map<string, typeof allBooks>();
  for (const b of allBooks) {
    const arr = booksByUser.get(b.user_id) ?? [];
    arr.push(b);
    booksByUser.set(b.user_id, arr);
  }

  const statsByUser = new Map<string, typeof weekStats>();
  for (const s of weekStats) {
    const arr = statsByUser.get(s.user_id) ?? [];
    arr.push(s);
    statsByUser.set(s.user_id, arr);
  }

  const pomodorosByUser = new Map<string, typeof pomodoros>();
  for (const p of pomodoros) {
    const arr = pomodorosByUser.get(p.user_id) ?? [];
    arr.push(p);
    pomodorosByUser.set(p.user_id, arr);
  }

  const recentStatsByUser = new Map<string, typeof recentStats>();
  for (const s of recentStats) {
    const arr = recentStatsByUser.get(s.user_id) ?? [];
    arr.push(s);
    recentStatsByUser.set(s.user_id, arr);
  }

  // Orchestrator handles delivery
  const orchestrator = new NotificationOrchestrator();
  let telegramSent = 0;
  let pushSent = 0;

  for (const settings of allSettings) {
    const userId = settings.user_id;

    const result = await orchestrator.processWeeklyNotification(settings, {
      weekStats: statsByUser.get(userId) ?? [],
      books: booksByUser.get(userId) ?? [],
      bibleReadingsCount: 0, // Not used in weekly message
      pomodoros: pomodorosByUser.get(userId) ?? [],
      recentStats: recentStatsByUser.get(userId) ?? [],
    });

    if (result.telegramSent) telegramSent++;
    if (result.pushSent) pushSent++;
  }

  logger.info("Weekly cron run completed", {
    telegramSent,
    pushSent,
    date: todayStr,
    userCount: allSettings.length,
  });

  return NextResponse.json({ ok: true, telegramSent, pushSent, date: todayStr });
}
