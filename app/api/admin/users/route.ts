import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");

  if (bearer !== process.env.CRON_SECRET && querySecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    // Get all users from user_settings (proxy for registered users)
    const { data: settings } = await sb.from("user_settings").select("user_id, created_at").order("created_at", { ascending: false }).limit(100);

    const users = [];
    for (const s of settings || []) {
      // Get latest activity
      const { data: lastStat } = await sb.from("daily_stats").select("date, goals_completed").eq("user_id", s.user_id).order("date", { ascending: false }).limit(1);
      const { count: bookCount } = await sb.from("books").select("*", { count: "exact", head: true }).eq("user_id", s.user_id);
      const { count: pomodoroCount } = await sb.from("pomodoro_sessions").select("*", { count: "exact", head: true }).eq("user_id", s.user_id);
      const { data: planData } = await sb.from("user_plans").select("plan").eq("user_id", s.user_id).maybeSingle();

      users.push({
        id: s.user_id,
        joinedAt: s.created_at,
        lastActive: lastStat?.[0]?.date || null,
        books: bookCount || 0,
        pomodoros: pomodoroCount || 0,
        plan: planData?.plan || "free",
      });
    }

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
