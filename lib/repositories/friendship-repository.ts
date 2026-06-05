import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
  updated_at: string;
}

export class FriendshipRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async sendRequest(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    if (requesterId === addresseeId) return null;

    return MetricsService.measure("friendship_send", async () => {
      const { data, error } = await this.client
        .from("friendships")
        .upsert({
          requester_id: requesterId,
          addressee_id: addresseeId,
          status: "pending",
        }, { onConflict: "requester_id,addressee_id" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as Friendship;
    }, { table: "friendships" });
  }

  async acceptRequest(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    return MetricsService.measure("friendship_accept", async () => {
      const { data, error } = await this.client
        .from("friendships")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("requester_id", requesterId)
        .eq("addressee_id", addresseeId)
        .eq("status", "pending")
        .select()
        .maybeSingle();
      if (error) return null;
      return data as Friendship;
    }, { table: "friendships" });
  }

  async removeFriend(userId1: string, userId2: string): Promise<boolean> {
    return MetricsService.measure("friendship_remove", async () => {
      const { error } = await this.client
        .from("friendships")
        .delete()
        .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`);
      return !error;
    }, { table: "friendships" });
  }

  async getFriends(userId: string): Promise<Friendship[]> {
    return MetricsService.measure("friendship_getFriends", async () => {
      const { data } = await this.client
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");
      return (data as Friendship[]) ?? [];
    }, { table: "friendships" });
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return MetricsService.measure("friendship_getPending", async () => {
      const { data } = await this.client
        .from("friendships")
        .select("*")
        .eq("addressee_id", userId)
        .eq("status", "pending");
      return (data as Friendship[]) ?? [];
    }, { table: "friendships" });
  }

  async getFriendship(userId1: string, userId2: string): Promise<Friendship | null> {
    return MetricsService.measure("friendship_get", async () => {
      const { data } = await this.client
        .from("friendships")
        .select("*")
        .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)
        .maybeSingle();
      return data as Friendship | null;
    }, { table: "friendships" });
  }

  async getFriendCount(userId: string): Promise<number> {
    return MetricsService.measure("friendship_count", async () => {
      const { count } = await this.client
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq("status", "accepted");
      return count ?? 0;
    }, { table: "friendships" });
  }
}
