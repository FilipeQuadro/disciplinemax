import { StreakRepository, type UserStreak } from "@/lib/repositories/streak-repository";
import { SettingsRepository } from "@/lib/repositories/settings-repository";
import { EventTrackingService } from "@/lib/repositories/event-tracking-repository";
import { EVENT_TYPES } from "@/lib/repositories/event-tracking-repository";

export class StreakService {
  private streakRepo: StreakRepository;
  private settingsRepo: SettingsRepository;
  private eventService: EventTrackingService;

  constructor(streakRepo?: StreakRepository, eventService?: EventTrackingService, settingsRepo?: SettingsRepository) {
    this.streakRepo = streakRepo ?? new StreakRepository();
    this.eventService = eventService ?? new EventTrackingService();
    this.settingsRepo = settingsRepo ?? new SettingsRepository();
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
      const settings = await this.settingsRepo.getSettingsByUserId(userId);
      if (settings) {
        const freezeAvail = (settings.streak_freeze_available ?? 1);
        const freezeUsed = (settings.streak_freeze_used ?? 0);
        return {
          available: freezeAvail - freezeUsed,
          maxPerMonth: freezeAvail,
        };
      }
    } catch { /* fallback to defaults */ }
    return { available: 1, maxPerMonth: 1 };
  }
}
