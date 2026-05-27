import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  // Authenticate the caller
  const callerId = await getAuthUserId(req);
  if (!callerId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = JSON.parse(await req.text());
  const { endpoint, keys, device_token, platform, bundle_id, user_id } = body;

  // Verify the caller owns this user_id
  if (user_id !== callerId) {
    return NextResponse.json({ error: "Cannot subscribe for another user" }, { status: 403 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  if (platform === "apns") {
    if (!device_token) {
      return NextResponse.json({ error: "Invalid APNS registration" }, { status: 400 });
    }
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

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

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
