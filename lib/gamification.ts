import { useStore } from "@/store/useStore";
import type { GamificationAction } from "@/app/api/gamification/route";

interface GamificationResult {
  xp: { total: number; level: number; xpGained: number; xpToNext: number; levelProgress: number };
  newAchievements: string[];
  challengeUpdates: Array<{ id: string; progress: number; target: number; completed: boolean; xpReward: number }>;
  streak: { current: number; longest: number } | null;
}

/**
 * Process a gamification event server-side.
 * Awards XP, records streak activity, checks achievements and challenges.
 * Call this AFTER the main action (trackPagesRead, trackPomodoroCompleted, etc.)
 * so the gamification layer is always best-effort and never blocks the user.
 */
export async function processGamification(
  action: GamificationAction,
  data?: { pages?: number; bookId?: string },
): Promise<GamificationResult | null> {
  const { userId } = useStore.getState();
  if (!userId) return null;

  try {
    const res = await fetch("/api/gamification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, data: data ?? {} }),
    });

    if (!res.ok) return null;

    const result: GamificationResult = await res.json();

    // Update local store with XP/level
    if (result.xp) {
      const store = useStore.getState();
      store.setTotalXp(result.xp.total);
      store.setCurrentLevel(result.xp.level);
    }

    return result;
  } catch {
    return null;
  }
}
