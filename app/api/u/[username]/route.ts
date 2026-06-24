import { NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";
import { XpRepository } from "@/lib/repositories/xp-repository";
import { AchievementRepository } from "@/lib/repositories/achievement-repository";
import { StreakRepository } from "@/lib/repositories/streak-repository";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    if (!username || username.length < 3) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    const profileService = new ProfileService();
    const profile = await profileService.getPublicProfile(username);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch public stats in parallel
    const [xpRes, achievementsRes, streakRes] = await Promise.all([
      new XpRepository().getXp(profile.user_id),
      new AchievementRepository().getUnlocked(profile.user_id),
      new StreakRepository().getStreak(profile.user_id),
    ]);

    return NextResponse.json({
      profile: {
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
        booksCompleted: profile.books_completed,
        totalPages: profile.total_pages,
        pomodorosTotal: profile.pomodoros_total,
        bibleChaptersTotal: profile.bible_chapters_total,
        xp: xpRes?.total_xp ?? 0,
        level: xpRes?.current_level ?? 1,
        achievements: achievementsRes.filter((a) => a.completed).map((a) => a.achievement_id),
        currentStreak: streakRes?.current_streak ?? 0,
        longestStreak: streakRes?.longest_streak ?? 0,
      },
    });
  } catch (e) {
    logger.error("Public profile GET error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
