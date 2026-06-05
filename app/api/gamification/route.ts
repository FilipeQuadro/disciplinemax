import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db-client";
import { LevelService, XP_REWARDS, type XpSource } from "@/lib/services/level-service";
import { StreakService } from "@/lib/services/streak-service";
import { AchievementService, type AchievementState } from "@/lib/services/achievement-service";
import { ChallengeService, type ChallengeState } from "@/lib/services/challenge-service";
import { FeedService, FEED_EVENT_TYPES } from "@/lib/services/feed-service";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { logger } from "@/lib/logger";

export type GamificationAction = "page_read" | "pomodoro_completed" | "bible_chapter" | "book_finished" | "goal_completed";

interface GamificationRequest {
  action: GamificationAction;
  userId: string;
  data?: {
    pages?: number;
    bookId?: string;
  };
}

interface GamificationResponse {
  xp: { total: number; level: number; xpGained: number; xpToNext: number; levelProgress: number };
  newAchievements: string[];
  challengeUpdates: Array<{ id: string; progress: number; target: number; completed: boolean; xpReward: number }>;
  streak: { current: number; longest: number } | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as GamificationRequest;
    const { action, userId, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const validActions: GamificationAction[] = ["page_read", "pomodoro_completed", "bible_chapter", "book_finished", "goal_completed"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Verify user exists via service client
    const client = getServiceClient();
    const { data: userExists } = await client
      .from("user_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await processGamificationAction(action, userId, data ?? {});
    return NextResponse.json(result);
  } catch (e) {
    logger.error("Gamification API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processGamificationAction(
  action: GamificationAction,
  userId: string,
  data: Record<string, unknown>,
): Promise<GamificationResponse> {
  const xpRepo = new XpRepository();
  const streakService = new StreakService();
  const achievementService = new AchievementService();
  const challengeService = new ChallengeService();

  // 1. Award XP based on action
  let xpGained = 0;
  let xpSource: XpSource = "PAGE_READ";

  switch (action) {
    case "page_read": {
      const pages = Math.max(1, Number(data.pages) || 1);
      xpGained = pages * XP_REWARDS.PAGE_READ;
      xpSource = "PAGE_READ";
      break;
    }
    case "pomodoro_completed": {
      xpGained = XP_REWARDS.POMODORO_COMPLETED;
      xpSource = "POMODORO_COMPLETED";
      break;
    }
    case "bible_chapter": {
      xpGained = XP_REWARDS.BIBLE_CHAPTER;
      xpSource = "BIBLE_CHAPTER";
      break;
    }
    case "book_finished": {
      xpGained = XP_REWARDS.BOOK_FINISHED;
      xpSource = "BOOK_FINISHED";
      break;
    }
    case "goal_completed": {
      xpGained = XP_REWARDS.GOAL_COMPLETED;
      xpSource = "GOAL_COMPLETED";
      break;
    }
  }

  const newXp = await xpRepo.addXp(userId, xpGained, xpSource, data.bookId as string | undefined);
  let totalXp = newXp?.total_xp ?? 0;
  let currentLevel = newXp?.current_level ?? 1;

  // 2. Record streak activity (for all actions)
  let streakResult = null;
  try {
    const streak = await streakService.recordActivity(userId);
    streakResult = streak ? { current: streak.current_streak, longest: streak.longest_streak } : null;
  } catch { /* best effort */ }

  // 3. Compute achievement state from DB
  const achievementState = await computeAchievementState(userId, totalXp);
  let newAchievements: string[] = [];
  try {
    newAchievements = await achievementService.checkAndUnlock(userId, achievementState);
  } catch { /* best effort */ }

  // 3b. Award bonus XP for newly unlocked achievements
  if (newAchievements.length > 0) {
    try {
      for (const achId of newAchievements) {
        await xpRepo.addXp(userId, XP_REWARDS.ACHIEVEMENT_UNLOCKED, "ACHIEVEMENT_UNLOCKED", achId);
      }
      // Refresh XP after achievement bonuses
      const refreshedXp = await xpRepo.getXp(userId);
      if (refreshedXp) {
        totalXp = refreshedXp.total_xp;
        currentLevel = refreshedXp.current_level;
        xpGained += newAchievements.length * XP_REWARDS.ACHIEVEMENT_UNLOCKED;
      }
    } catch { /* best effort */ }
  }

  // 4. Check challenge progress
  let challengeUpdates: GamificationResponse["challengeUpdates"] = [];
  try {
    const challengeState = await computeChallengeState(userId);
    const updated = await challengeService.checkProgress(userId, challengeState);
    challengeUpdates = updated.map((c) => ({
      id: c.challenge_id,
      progress: c.progress,
      target: c.target,
      completed: c.completed,
      xpReward: c.xp_reward,
    }));
  } catch { /* best effort */ }

  // 5. Track feed events (best effort)
  try {
    const feedService = new FeedService();
    if (newAchievements.length > 0) {
      for (const achId of newAchievements) {
        await feedService.trackEvent(userId, FEED_EVENT_TYPES.ACHIEVEMENT_UNLOCKED, { achievement_id: achId });
      }
    }
    for (const chal of challengeUpdates) {
      if (chal.completed) {
        await feedService.trackEvent(userId, FEED_EVENT_TYPES.CHALLENGE_COMPLETED, { challenge_id: chal.id });
      }
    }
    if (action === "book_finished") {
      await feedService.trackEvent(userId, FEED_EVENT_TYPES.BOOK_FINISHED, { book_id: data.bookId });
    }
    if (streakResult && streakResult.current > 0 && streakResult.current % 7 === 0) {
      await feedService.trackEvent(userId, FEED_EVENT_TYPES.STREAK_RECORD, { streak: streakResult.current });
    }
  } catch { /* best effort */ }

  return {
    xp: {
      total: totalXp,
      level: currentLevel,
      xpGained,
      xpToNext: LevelService.xpToNextLevel(totalXp),
      levelProgress: LevelService.levelProgress(totalXp),
    },
    newAchievements,
    challengeUpdates,
    streak: streakResult,
  };
}

async function computeAchievementState(userId: string, totalXp: number): Promise<AchievementState> {
  const client = getServiceClient();

  // Get streak
  const { data: streakData } = await client
    .from("user_streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  // Get books stats
  const { data: booksData } = await client
    .from("books")
    .select("current_page, total_pages")
    .eq("user_id", userId);

  // Get total bible chapters
  const { count: bibleCount } = await client
    .from("bible_readings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Get total pomodoros
  const { count: pomodoroCount } = await client
    .from("pomodoro_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  // Get completed challenges count
  const { count: challengesCount } = await client
    .from("user_challenges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

  const books = (booksData as Array<{ current_page: number; total_pages: number }>) ?? [];
  const totalPagesRead = books.reduce((s, b) => s + b.current_page, 0);
  const booksCompleted = books.filter((b) => b.current_page >= b.total_pages).length;

  return {
    streak: streakData?.current_streak ?? 0,
    longestStreak: streakData?.longest_streak ?? 0,
    booksCompleted,
    totalPagesRead,
    bibleChaptersTotal: bibleCount ?? 0,
    pomodorosTotal: pomodoroCount ?? 0,
    totalXp,
    challengesCompleted: challengesCount ?? 0,
  };
}

async function computeChallengeState(userId: string): Promise<ChallengeState> {
  const client = getServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  // Get streak
  const { data: streakData } = await client
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  // Get this week's daily stats
  const { data: weekStats } = await client
    .from("daily_stats")
    .select("pomodoros_completed, books_pages_read, bible_chapters_read, goals_completed")
    .eq("user_id", userId)
    .gte("date", weekAgo);

  const stats = (weekStats as Array<{ pomodoros_completed: number; books_pages_read: number; bible_chapters_read: number; goals_completed: boolean }>) ?? [];

  // Get books finished this week
  const { data: booksData } = await client
    .from("books")
    .select("current_page, total_pages, updated_at")
    .eq("user_id", userId);

  const booksFinishedThisWeek = (booksData as Array<{ current_page: number; total_pages: number; updated_at: string }> ?? [])
    .filter((b) => b.current_page >= b.total_pages && b.updated_at >= weekAgo).length;

  return {
    streak: streakData?.current_streak ?? 0,
    pomodorosThisWeek: stats.reduce((s, d) => s + d.pomodoros_completed, 0),
    pagesThisWeek: stats.reduce((s, d) => s + d.books_pages_read, 0),
    bibleChaptersThisWeek: stats.reduce((s, d) => s + d.bible_chapters_read, 0),
    goalsCompletedThisWeek: stats.filter((d) => d.goals_completed).length,
    booksCompletedThisWeek: booksFinishedThisWeek,
  };
}
