import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/db-client";
import { MetricsService } from "@/lib/metrics";

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export class GroupRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client ?? getServiceClient();
  }

  async listGroups(): Promise<Group[]> {
    return MetricsService.measure("group_list", async () => {
      const { data } = await this.client
        .from("groups")
        .select("*")
        .order("name");
      return (data as Group[]) ?? [];
    }, { table: "groups" });
  }

  async getGroupBySlug(slug: string): Promise<Group | null> {
    return MetricsService.measure("group_getBySlug", async () => {
      const { data } = await this.client
        .from("groups")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      return data as Group | null;
    }, { table: "groups" });
  }

  async joinGroup(groupId: string, userId: string): Promise<GroupMember | null> {
    return MetricsService.measure("group_join", async () => {
      const { data, error } = await this.client
        .from("group_members")
        .upsert({ group_id: groupId, user_id: userId }, { onConflict: "group_id,user_id" })
        .select()
        .maybeSingle();
      if (error) return null;
      return data as GroupMember;
    }, { table: "group_members" });
  }

  async leaveGroup(groupId: string, userId: string): Promise<boolean> {
    return MetricsService.measure("group_leave", async () => {
      const { error } = await this.client
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      return !error;
    }, { table: "group_members" });
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    return MetricsService.measure("group_getUserGroups", async () => {
      const { data } = await this.client
        .from("group_members")
        .select("group_id, groups(id, name, slug, description, created_at)")
        .eq("user_id", userId);
      return ((data as any[]) ?? []).map((d) => d.groups).filter(Boolean) as Group[];
    }, { table: "group_members" });
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return MetricsService.measure("group_getMembers", async () => {
      const { data } = await this.client
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });
      return (data as GroupMember[]) ?? [];
    }, { table: "group_members" });
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return MetricsService.measure("group_isMember", async () => {
      const { data } = await this.client
        .from("group_members")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    }, { table: "group_members" });
  }

  async getGroupRanking(groupId: string): Promise<Array<{ user_id: string; username: string | null; display_name: string | null; xp: number }>> {
    return MetricsService.measure("group_getRanking", async () => {
      const members = await this.getGroupMembers(groupId);
      if (members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);
      const { data } = await this.client
        .from("user_xp")
        .select("user_id, total_xp, user_profiles(username, display_name)")
        .in("user_id", userIds)
        .order("total_xp", { ascending: false });

      return ((data as any[]) ?? []).map((d) => ({
        user_id: d.user_id,
        username: d.user_profiles?.username,
        display_name: d.user_profiles?.display_name,
        xp: d.total_xp,
      }));
    }, { table: "user_xp" });
  }
}
