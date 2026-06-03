import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notificationSubscribeSchema } from "@/lib/schemas";
import { RateLimitService } from "@/lib/rate-limit";
import { initRequestId } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verify the request's Bearer token is a valid Supabase session.
 * Returns the authenticated user ID, or null if invalid.
 */
async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const sb = createClient(supabaseUrl!, supabaseKey!);
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

export async function POST(req: NextRequest) {
  initRequestId(req);

  const rateLimited = RateLimitService.checkRequest(req, "notifications");
  if (rateLimited) return rateLimited;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  // Authenticate the caller
  const callerId = await getAuthUserId(req);
  if (!callerId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const parsed = notificationSubscribeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { platform, user_id } = parsed.data;

  // Verify the caller owns this user_id
  if (user_id !== callerId) {
    return NextResponse.json({ error: "Cannot subscribe for another user" }, { status: 403 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  if (platform === "apns") {
    const { device_token, bundle_id } = parsed.data;
    const { error } = await sb.from("notification_subscriptions").upsert({
      user_id: callerId,
      platform: "apns",
      device_token,
      bundle_id: bundle_id || process.env.APNS_BUNDLE_ID || "br.com.disciplina.app",
      created_at: new Date().toISOString(),
    }, { onConflict: "device_token" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { endpoint, keys } = parsed.data;
  const { error } = await sb.from("notification_subscriptions").upsert({
    user_id: callerId,
    platform: "web",
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    created_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
