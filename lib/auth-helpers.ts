import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Verify the request's Bearer token is a valid Supabase session.
 * Uses the ANON key (not service_role) to validate the JWT — this
 * ensures the token is a real user session, not a fabricated one.
 *
 * Returns the authenticated user ID, or null if invalid/missing.
 */
export async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!supabaseUrl || !anonKey) return null;

  const sb = createClient(supabaseUrl, anonKey);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}
