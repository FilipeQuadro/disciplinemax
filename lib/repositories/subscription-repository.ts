import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class SubscriptionRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async getWebSubscriptions(userId: string): Promise<PushSubscription[]> {
    const { data } = await this.client
      .from("notification_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)
      .eq("platform", "web");
    return (data as PushSubscription[]) ?? [];
  }

  async removeExpiredSubscription(endpoint: string): Promise<boolean> {
    const { error } = await this.client
      .from("notification_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    return !error;
  }

  async removeExpiredSubscriptions(endpoints: string[]): Promise<number> {
    let removed = 0;
    for (const endpoint of endpoints) {
      const ok = await this.removeExpiredSubscription(endpoint);
      if (ok) removed++;
    }
    return removed;
  }
}
