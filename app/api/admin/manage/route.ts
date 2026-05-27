import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Block/unblock/reset/delete a user
export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const body = JSON.parse(await req.text());
  const { user_id, action, reason } = body;

  if (!user_id || !action) return NextResponse.json({ error: "user_id and action required" }, { status: 400 });

  try {
    if (action === "block") {
      await sb.from("blocked_users").upsert({
        user_id,
        reason: reason || "Blocked by admin",
        blocked_by: actorId,
      });

      await sb.from("audit_logs").insert({
        actor_id: actorId,
        action: "user_blocked",
        target_type: "user",
        target_id: user_id,
        details: { reason: reason || "Blocked by admin" },
      });

      return NextResponse.json({ ok: true, action: "blocked" });
    }

    if (action === "unblock") {
      await sb.from("blocked_users").delete().eq("user_id", user_id);

      await sb.from("audit_logs").insert({
        actor_id: actorId,
        action: "user_unblocked",
        target_type: "user",
        target_id: user_id,
      });

      return NextResponse.json({ ok: true, action: "unblocked" });
    }

    if (action === "reset_data") {
      const tables = ["books", "bible_readings", "bible_goals", "pomodoro_sessions", "daily_stats", "achievements", "notifications_sent", "notification_subscriptions"];
      for (const table of tables) {
        await sb.from(table).delete().eq("user_id", user_id);
      }
      await sb.from("user_settings").update({
        whatsapp_number: null,
        callmebot_api_key: null,
        telegram_bot_token: null,
        telegram_chat_id: null,
        notification_times: ["07:00", "12:00", "19:00"],
        pomodoro_duration: 25,
        short_break: 5,
        long_break: 15,
        pomodoros_until_long: 4,
        daily_books_goal: 20,
        daily_bible_chapters: 3,
        gemini_api_key: null,
        streak_freeze_available: 1,
        streak_freeze_used: 0,
      }).eq("user_id", user_id);

      await sb.from("audit_logs").insert({
        actor_id: actorId,
        action: "user_data_reset",
        target_type: "user",
        target_id: user_id,
      });

      return NextResponse.json({ ok: true, action: "data_reset" });
    }

    if (action === "delete") {
      const tables = ["books", "bible_readings", "bible_goals", "pomodoro_sessions", "daily_stats", "achievements", "notifications_sent", "notification_subscriptions", "user_settings", "user_plans"];
      for (const table of tables) {
        await sb.from(table).delete().eq("user_id", user_id);
      }

      await sb.from("audit_logs").insert({
        actor_id: actorId,
        action: "user_deleted",
        target_type: "user",
        target_id: user_id,
      });

      return NextResponse.json({ ok: true, action: "deleted" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Check if a user is blocked
export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  const { data } = await sb.from("blocked_users").select("user_id").eq("user_id", userId).maybeSingle();
  return NextResponse.json({ blocked: !!data });
}
