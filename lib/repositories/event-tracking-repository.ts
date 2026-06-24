import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";
import { logger } from "@/lib/logger";

// ── Event type constants ──────────────────────────────────────────
export const EVENT_TYPES = {
  USER_REGISTERED: "user_registered",
  NOTIFICATION_SENT: "notification_sent",
  NOTIFICATION_OPENED: "notification_opened",
  GOAL_COMPLETED: "goal_completed",
  BOOK_FINISHED: "book_finished",
  POMODORO_COMPLETED: "pomodoro_completed",
  STREAK_EXTENDED: "streak_extended",
  STREAK_BROKEN: "streak_broken",
  ONBOARDING_COMPLETED: "onboarding_completed",
  PAGE_REGISTERED: "page_registered",
  BIBLE_CHAPTER_READ: "bible_chapter_read",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export interface ProductEvent {
  id: string;
  user_id: string;
  event_type: EventType;
  event_data: Record<string, unknown>;
  created_at: string;
}

/**
 * Repository for persisting and querying product events.
 */
export class EventTrackingRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  /**
   * Track (insert) a single event.
   */
  async track(userId: string, eventType: EventType, eventData: Record<string, unknown> = {}): Promise<boolean> {
    try {
      const { error } = await this.client.from("product_events").insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
      });

      if (error) {
        logger.error("Failed to track event", { userId, eventType, error: error.message });
        return false;
      }

      return true;
    } catch (e: unknown) {
      logger.error("Event tracking exception", { userId, eventType, error: String(e) });
      return false;
    }
  }

  /**
   * Track a batch of events (for bulk operations like cron).
   */
  async trackBatch(events: Array<{ user_id: string; event_type: EventType; event_data?: Record<string, unknown> }>): Promise<number> {
    if (events.length === 0) return 0;

    const rows = events.map((e) => ({
      user_id: e.user_id,
      event_type: e.event_type,
      event_data: e.event_data ?? {},
    }));

    const { error } = await this.client.from("product_events").insert(rows);

    if (error) {
      logger.error("Failed to track batch", { count: events.length, error: error.message });
      return 0;
    }

    return events.length;
  }

  /**
   * Get events for a user.
   */
  async getByUserId(userId: string, limit = 50): Promise<ProductEvent[]> {
    const { data, error } = await this.client
      .from("product_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data as ProductEvent[]) ?? [];
  }

  /**
   * Get event counts by type in a date range.
   */
  async getEventCounts(since: string, until?: string): Promise<Record<string, number>> {
    let query = this.client
      .from("product_events")
      .select("event_type")
      .gte("created_at", since);

    if (until) {
      query = query.lt("created_at", until);
    }

    const { data, error } = await query;

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data as Array<{ event_type: string }>) {
      counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    }
    return counts;
  }

  /**
   * Count unique users for a given event type in a period.
   */
  async getUniqueUsers(eventType: EventType, since: string): Promise<number> {
    const { data, error } = await this.client
      .from("product_events")
      .select("user_id")
      .eq("event_type", eventType)
      .gte("created_at", since);

    if (error || !data) return 0;

    const uniqueIds = new Set(data.map((r: { user_id: string }) => r.user_id));
    return uniqueIds.size;
  }

  /**
   * Cleanup old events (older than 90 days).
   */
  async cleanupOld(): Promise<number> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await this.client
      .from("product_events")
      .delete({ count: "exact" })
      .lt("created_at", ninetyDaysAgo);

    if (error) {
      logger.error("Failed to cleanup events", { error: error.message });
      return 0;
    }
    return count ?? 0;
  }
}

/**
 * Service for tracking product events with metrics integration.
 * Wraps the repository with metrics and batching.
 */
export class EventTrackingService {
  private repo: EventTrackingRepository;

  constructor(repo?: EventTrackingRepository) {
    this.repo = repo ?? new EventTrackingRepository();
  }

  /**
   * Track a product event. Non-blocking — errors are logged but don't throw.
   */
  async track(userId: string, eventType: EventType, eventData: Record<string, unknown> = {}): Promise<void> {
    MetricsService.increment("event_tracked", { type: eventType });
    await this.repo.track(userId, eventType, eventData);
  }

  /**
   * Track a batch of events.
   */
  async trackBatch(events: Array<{ user_id: string; event_type: EventType; event_data?: Record<string, unknown> }>): Promise<number> {
    if (events.length === 0) return 0;
    MetricsService.increment("event_tracked_batch", {}, events.length);
    return this.repo.trackBatch(events);
  }
}
