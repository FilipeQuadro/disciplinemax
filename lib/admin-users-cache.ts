import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface CachedUsers {
  users: User[];
  fetchedAt: number;
}

let cache: CachedUsers | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function getAdminUsers(): Promise<User[]> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.users;
  }

  if (!supabaseUrl || !supabaseKey) {
    logger.error("admin-users-cache: Supabase not configured");
    return [];
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await sb.auth.admin.listUsers();

  if (error) {
    logger.error("admin-users-cache: listUsers failed", { error: error.message });
    // Return stale cache if available rather than empty
    return cache?.users ?? [];
  }

  const users = data?.users ?? [];
  cache = { users, fetchedAt: now };

  logger.info("admin-users-cache: refreshed", { count: users.length });
  return users;
}

export function invalidateAdminUsersCache(): void {
  cache = null;
}
