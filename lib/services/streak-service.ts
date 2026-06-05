import { StreakRepository, type UserStreak } from "@/lib/repositories/streak-repository";
import { EventTrackingService } from "@/lib/repositories/event-tracking-repository";
import { EVENT_TYPES } from "@/lib/repositories/event-tracking-repository";

export class StreakService {
  private streakRepo: StreakRepository;
  private eventService: EventTrackingService;

  constructor(streakRepo?: StreakRepository, eventService?: EventTrackingService) {
    this.streakRepo = streakRepo ?? new StreakRepository();
    this.eventService = eventService ?? new EventTrackingService();
  }

  /** Called when user completes a goal-qualifying action (pages read, pomodoro, bible chapter) */
  async recordActivity(userId: string, today?: string): Promise<UserStreak | null> {
    const todayStr = today ?? new Date().toISOString().split("T")[0];
    const existing = await this.streakRepo.getStreak(userId);

    if (existing && existing.last_active_date === todayStr) {
      return existing; // Already counted today
    }

    const result = await this.streakRepo.incrementStreak(userId);

    if (result) {
      // Track streak event
      if (result.current_streak > 0) {
        await this.eventService.track(userId, EVENT_TYPES.STREAK_EXTENDED, {
          streak: result.current_streak,
          date: todayStr,
        }).catch(() => {}); // best effort
      }
    }

    return result;
  }

  /** Check if streak should be broken (called by cron to validate consistency) */
  async validateStreak(userId: string, today?: string): Promise<UserStreak | null> {
    const todayStr = today ?? new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const existing = await this.streakRepo.getStreak(userId);

    if (!existing) return null;

    // If last active was before yesterday and streak is > 0, streak is broken
    if (existing.current_streak > 0 && existing.last_active_date && existing.last_active_date < yesterday) {
      // Check for streak freeze
      const settings = await this.getFreezeSettings(userId);
      if (settings.available > 0 && existing.streak_freeze_count < settings.maxPerMonth) {
        // Apply freeze: keep streak, increment freeze count
        await this.streakRepo.useFreeze(userId);
        const updated = await this.streakRepo.getStreak(userId);
        return updated;
      }

      // Break the streak
      await this.streakRepo.breakStreak(userId);
      await this.eventService.track(userId, EVENT_TYPES.STREAK_BROKEN, {
        previous_streak: existing.current_streak,
        date: todayStr,
      }).catch(() => {});

      const updated = await this.streakRepo.getStreak(userId);
      return updated;
    }

    return existing;
  }

  async getStreak(userId: string): Promise<UserStreak | null> {
    return this.streakRepo.getStreak(userId);
  }

  computeNextLevelXp(level: number): number {
    return level * level * 100;
  }

  private async getFreezeSettings(userId: string): Promise<{ available: number; maxPerMonth: number }> {
    try {
      const { getServiceClient } = await import("@/lib/db-client");
      const client = getServiceClient();
      const { data } = await client
        .from("user_settings")
        .select("streak_freeze_available, streak_freeze_used")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        return {
          available: (data.streak_freeze_available ?? 1) - (data.streak_freeze_used ?? 0),
          maxPerMonth: data.streak_freeze_available ?? 1,
        };
      }
    } catch { /* fallback to defaults */ }
    return { available: 1, maxPerMonth: 1 };
  }
}
