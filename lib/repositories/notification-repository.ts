import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";

export class NotificationRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async wasAlreadySent(userId: string, notifKey: string): Promise<boolean> {
    const { data } = await this.client
      .from("notifications_sent")
      .select("id")
      .eq("user_id", userId)
      .eq("notif_key", notifKey)
      .maybeSingle();
    return !!data;
  }

  async recordSent(userId: string, notifKey: string): Promise<void> {
    try {
      await this.client.from("notifications_sent").insert({
        user_id: userId,
        notif_key: notifKey,
      });
    } catch {
      // UNIQUE constraint — already exists, safe to ignore
    }
  }

  async cleanupOld(olderThan: string): Promise<void> {
    await this.client
      .from("notifications_sent")
      .delete()
      .lt("sent_at", olderThan);
  }

  async getRecent(limit = 10): Promise<Array<{ sent_at: string; notif_key: string }>> {
    const { data } = await this.client
      .from("notifications_sent")
      .select("sent_at, notif_key")
      .order("sent_at", { ascending: false })
      .limit(limit);
    return (data as Array<{ sent_at: string; notif_key: string }>) ?? [];
  }
}
