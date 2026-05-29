import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify that the request comes from an authenticated admin user.
 * Reads the Authorization header (Bearer token), validates the JWT
 * with Supabase, and checks the admin_users table.
 *
 * Returns the authenticated user ID on success, or null on failure.
 */
export async function verifyAdmin(req: Request): Promise<string | null> {
  if (!supabaseUrl || !supabaseKey) return null;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  // Verify the JWT with Supabase
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;

  // Check admin_users table
  const { data } = await sb
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? user.id : null;
}

/**
 * Verify the request comes from the CRON_SECRET (for server-to-server calls like cron-job.org).
 * Accepts both Bearer header and ?secret= query param (cron-job.org sends query).
 */
export function verifyCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearer === process.env.CRON_SECRET) return true;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  return querySecret === process.env.CRON_SECRET;
}

/**
 * Combined auth: accepts either admin session or CRON_SECRET.
 * Returns { isAdmin: boolean, actorId: string }
 */
export async function verifyAdminOrCron(req: Request): Promise<{ isAdmin: boolean; actorId: string }> {
  // Try cron secret first (server-to-server)
  if (verifyCronSecret(req)) {
    return { isAdmin: true, actorId: "cron" };
  }

  // Try admin session
  const adminId = await verifyAdmin(req);
  if (adminId) {
    return { isAdmin: true, actorId: adminId };
  }

  return { isAdmin: false, actorId: "" };
}
