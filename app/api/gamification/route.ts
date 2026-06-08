import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db-client";
import { LevelService, XP_REWARDS, type XpSource } from "@/lib/services/level-service";
import { StreakService } from "@/lib/services/streak-service";
import { AchievementService, type AchievementState, type AchievementDef } from "@/lib/services/achievement-service";
import { ChallengeService, type ChallengeState } from "@/lib/services/challenge-service";
import { FeedService, FEED_EVENT_TYPES } from "@/lib/services/feed-service";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { logger } from "@/lib/logger";
import { MetricsService } from "@/lib/metrics";
import { getAuthUserId } from "@/lib/auth-helpers";

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
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json() as GamificationRequest;
    const { action, userId, data } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    const validActions: GamificationAction[] = ["page_read", "pomodoro_completed", "bible_chapter", "book_finished", "goal_completed"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Ownership check: caller can only gamify as themselves
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only process your own gamification" }, { status: 403 });
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

  // 2. Record streak activity
  let streakResult = null;
  try {
    const streak = await streakService.recordActivity(userId);
    streakResult = streak ? { current: streak.current_streak, longest: streak.longest_streak } : null;
  } catch { /* best effort */ }

  // 3. Compute achievement + challenge state via batch RPC (1 call instead of 7)
  const gamificationState = await computeGamificationStateBatch(userId, totalXp);

  // 4. Check and unlock achievements
  let newAchievements: string[] = [];
  try {
    newAchievements = await achievementService.checkAndUnlock(userId, gamificationState.achievementState);
  } catch { /* best effort */ }

  // 4b. Award bonus XP for newly unlocked achievements (batch)
  if (newAchievements.length > 0) {
    try {
      const bonusXp = newAchievements.length * XP_REWARDS.ACHIEVEMENT_UNLOCKED;
      await xpRepo.addXp(userId, bonusXp, "ACHIEVEMENT_UNLOCKED");
      const refreshedXp = await xpRepo.getXp(userId);
      if (refreshedXp) {
        totalXp = refreshedXp.total_xp;
        currentLevel = refreshedXp.current_level;
        xpGained += bonusXp;
      }
    } catch { /* best effort */ }
  }

  // 5. Check challenge progress
  let challengeUpdates: GamificationResponse["challengeUpdates"] = [];
  try {
    const updated = await challengeService.checkProgress(userId, gamificationState.challengeState);
    challengeUpdates = updated.map((c) => ({
      id: c.challenge_id,
      progress: c.progress,
      target: c.target,
      completed: c.completed,
      xpReward: c.xp_reward,
    }));
  } catch { /* best effort */ }

  // 6. Track feed events (batch insert)
  try {
    const feedService = new FeedService();
    const feedEvents: Array<{ type: string; data: Record<string, unknown> }> = [];

    for (const achId of newAchievements) {
      feedEvents.push({ type: FEED_EVENT_TYPES.ACHIEVEMENT_UNLOCKED, data: { achievement_id: achId } });
    }
    for (const chal of challengeUpdates) {
      if (chal.completed) {
        feedEvents.push({ type: FEED_EVENT_TYPES.CHALLENGE_COMPLETED, data: { challenge_id: chal.id } });
      }
    }
    if (action === "book_finished") {
      feedEvents.push({ type: FEED_EVENT_TYPES.BOOK_FINISHED, data: { book_id: data.bookId } });
    }
    if (streakResult && streakResult.current > 0 && streakResult.current % 7 === 0) {
      feedEvents.push({ type: FEED_EVENT_TYPES.STREAK_RECORD, data: { streak: streakResult.current } });
    }

    // Batch all feed events
    await Promise.all(feedEvents.map((e) => feedService.trackEvent(userId, e.type as import("@/lib/services/feed-service").FeedEventType, e.data)));
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

/**
 * Batch-compute achievement + challenge state using a single RPC call.
 * Falls back to individual queries if RPC fails.
 */
async function computeGamificationStateBatch(
  userId: string,
  totalXp: number,
): Promise<{ achievementState: AchievementState; challengeState: ChallengeState }> {
  try {
    const client = getServiceClient();
    const result = await MetricsService.measure("gamification_rpc", async () => {
      const { data, error } = await client.rpc("compute_gamification_state", { p_user_id: userId });
      if (error) throw error;
      return data as Record<string, unknown>;
    }, { operation: "compute_gamification_state" });

    const achState = result.achievementState as Record<string, unknown>;
    const chalState = result.challengeState as Record<string, unknown>;

    return {
      achievementState: {
        streak: (achState.streak as number) ?? 0,
        longestStreak: (achState.longestStreak as number) ?? 0,
        booksCompleted: (achState.booksCompleted as number) ?? 0,
        totalPagesRead: (achState.totalPagesRead as number) ?? 0,
        bibleChaptersTotal: (achState.bibleChaptersTotal as number) ?? 0,
        pomodorosTotal: (achState.pomodorosTotal as number) ?? 0,
        totalXp,
        challengesCompleted: (achState.challengesCompleted as number) ?? 0,
      },
      challengeState: {
        streak: (chalState.streak as number) ?? 0,
        pomodorosThisWeek: (chalState.pomodorosThisWeek as number) ?? 0,
        pagesThisWeek: (chalState.pagesThisWeek as number) ?? 0,
        bibleChaptersThisWeek: (chalState.bibleChaptersThisWeek as number) ?? 0,
        goalsCompletedThisWeek: (chalState.goalsCompletedThisWeek as number) ?? 0,
        booksCompletedThisWeek: (chalState.booksCompletedThisWeek as number) ?? 0,
      },
    };
  } catch (e) {
    // Fallback to individual queries
    logger.warn("Gamification RPC failed, falling back to individual queries", { error: String(e) });
    const [achievementState, challengeState] = await Promise.all([
      computeAchievementStateFallback(userId, totalXp),
      computeChallengeStateFallback(userId),
    ]);
    return { achievementState, challengeState };
  }
}

/** Fallback: compute achievement state via individual queries (original approach) */
async function computeAchievementStateFallback(userId: string, totalXp: number): Promise<AchievementState> {
  const client = getServiceClient();

  const { data: streakData } = await client
    .from("user_streaks")
    .select("current_streak, longest_streak")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: booksData } = await client
    .from("books")
    .select("current_page, total_pages")
    .eq("user_id", userId);

  const { count: bibleCount } = await client
    .from("bible_readings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: pomodoroCount } = await client
    .from("pomodoro_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);

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

/** Fallback: compute challenge state via individual queries (original approach) */
async function computeChallengeStateFallback(userId: string): Promise<ChallengeState> {
  const client = getServiceClient();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

  const { data: streakData } = await client
    .from("user_streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: weekStats } = await client
    .from("daily_stats")
    .select("pomodoros_completed, books_pages_read, bible_chapters_read, goals_completed")
    .eq("user_id", userId)
    .gte("date", weekAgo);

  const stats = (weekStats as Array<{ pomodoros_completed: number; books_pages_read: number; bible_chapters_read: number; goals_completed: boolean }>) ?? [];

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
