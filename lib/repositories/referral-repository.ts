import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface Referral {
  id: string;
  referrer_id: string;
  invitee_id: string;
  referral_code: string;
  created_at: string;
}

export class ReferralRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async createReferral(referrerId: string, inviteeId: string, code: string): Promise<Referral | null> {
    return MetricsService.measure("referral_create", async () => {
      const { data, error } = await this.client
        .from("referrals")
        .insert({
          referrer_id: referrerId,
          invitee_id: inviteeId,
          referral_code: code,
        })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as Referral;
    }, { table: "referrals" });
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return MetricsService.measure("referral_getByReferrer", async () => {
      const { data } = await this.client
        .from("referrals")
        .select("*")
        .eq("referrer_id", referrerId)
        .order("created_at", { ascending: false });
      return (data as Referral[]) ?? [];
    }, { table: "referrals" });
  }

  async getReferralByInvitee(inviteeId: string): Promise<Referral | null> {
    return MetricsService.measure("referral_getByInvitee", async () => {
      const { data } = await this.client
        .from("referrals")
        .select("*")
        .eq("invitee_id", inviteeId)
        .maybeSingle();
      return data as Referral | null;
    }, { table: "referrals" });
  }

  async getReferralCount(referrerId: string): Promise<number> {
    return MetricsService.measure("referral_count", async () => {
      const { count } = await this.client
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", referrerId);
      return count ?? 0;
    }, { table: "referrals" });
  }
}
