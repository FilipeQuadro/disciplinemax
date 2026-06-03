import type { UserSettings } from "@/lib/supabase";

export interface ScheduleResult {
  shouldSend: boolean;
  matchedTime: string | null;
  dedupKey: string | null;
}

/**
 * Determines whether a notification should be sent for a user at the current time.
 * Pure business logic — no DB, no external calls.
 */
export class NotificationSchedulerService {
  /**
   * Check if current time matches any of the user's notification times (30 min tolerance).
   */
  static matchNotificationTime(
    currentMinutes: number,
    notifTimes: string[]
  ): string | null {
    return notifTimes.find((t) => {
      const [h, m] = t.split(":").map(Number);
      if (isNaN(h) || isNaN(m)) return false;
      const notifMinutes = h * 60 + m;
      return currentMinutes >= notifMinutes && currentMinutes < notifMinutes + 30;
    }) ?? null;
  }

  /**
   * Build the dedup key for a user/day/time combination.
   */
  static buildDedupKey(userId: string, today: string, matchedTime: string): string {
    return `${userId}_${today}_${matchedTime}`;
  }

  /**
   * Full schedule check: time matching + dedup key generation.
   */
  static checkSchedule(
    currentMinutes: number,
    settings: UserSettings,
    today: string
  ): ScheduleResult {
    const notifTimes: string[] = settings.notification_times || ["07:00", "12:00", "19:00"];
    const matchedTime = this.matchNotificationTime(currentMinutes, notifTimes);

    if (!matchedTime) {
      return { shouldSend: false, matchedTime: null, dedupKey: null };
    }

    const dedupKey = this.buildDedupKey(settings.user_id, today, matchedTime);
    return { shouldSend: true, matchedTime, dedupKey };
  }

  /**
   * Calculate current time in BRT (America/Sao_Paulo) as minutes from midnight.
   */
  static getCurrentBrtMinutes(): number {
    const now = new Date();
    const brtFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const brtTime = brtFormatter.format(now);
    const [h, m] = brtTime.split(":").map(Number);
    return h * 60 + m;
  }

  /**
   * Get today's date in BRT timezone (YYYY-MM-DD).
   */
  static getTodayBrt(): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
  }

  /**
   * Check if it's midnight in BRT (00:00–00:30) for daily reset.
   */
  static isMidnightBrt(): boolean {
    const minutes = this.getCurrentBrtMinutes();
    const hour = Math.floor(minutes / 60);
    return hour === 0 && minutes < 30;
  }
}
