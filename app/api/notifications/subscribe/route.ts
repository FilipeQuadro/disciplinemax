import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }
  const body = await req.json();
  const { endpoint, keys, device_token, platform, bundle_id, user_id } = body;
  const safeUserId = user_id || "default_user";

  if (platform === "apns") {
    if (!device_token) {
      return NextResponse.json({ error: "Invalid APNS registration" }, { status: 400 });
    }
    const { error } = await supabase.from("notification_subscriptions").upsert({
      user_id: safeUserId,
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

  const { error } = await supabase.from("notification_subscriptions").upsert({
    user_id: safeUserId,
    platform: "web",
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    created_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
