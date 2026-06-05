import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface FeedEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
  // Joined from user_profiles
  username?: string;
  display_name?: string;
}

export class FeedRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  /** Get feed events for a user's friends */
  async getFriendsFeed(friendIds: string[], limit = 30): Promise<FeedEvent[]> {
    if (friendIds.length === 0) return [];

    return MetricsService.measure("feed_getFriends", async () => {
      const { data } = await this.client
        .from("product_events")
        .select(`
          id, user_id, event_type, event_data, created_at,
          user_profiles!inner(username, display_name)
        `)
        .in("user_id", friendIds)
        .in("event_type", ["achievement_unlocked", "challenge_completed", "streak_record", "book_finished"])
        .order("created_at", { ascending: false })
        .limit(limit);

      return (data as any[])?.map((d) => ({
        id: d.id,
        user_id: d.user_id,
        event_type: d.event_type,
        event_data: d.event_data,
        created_at: d.created_at,
        username: d.user_profiles?.username,
        display_name: d.user_profiles?.display_name,
      })) ?? [];
    }, { table: "product_events" });
  }

  /** Get a user's own recent events */
  async getUserFeed(userId: string, limit = 20): Promise<FeedEvent[]> {
    return MetricsService.measure("feed_getUser", async () => {
      const { data } = await this.client
        .from("product_events")
        .select(`
          id, user_id, event_type, event_data, created_at,
          user_profiles!inner(username, display_name)
        `)
        .eq("user_id", userId)
        .in("event_type", ["achievement_unlocked", "challenge_completed", "streak_record", "book_finished"])
        .order("created_at", { ascending: false })
        .limit(limit);

      return (data as any[])?.map((d) => ({
        id: d.id,
        user_id: d.user_id,
        event_type: d.event_type,
        event_data: d.event_data,
        created_at: d.created_at,
        username: d.user_profiles?.username,
        display_name: d.user_profiles?.display_name,
      })) ?? [];
    }, { table: "product_events" });
  }
}
