import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: settings } = await sb.from("user_settings").select("user_id, created_at").order("created_at", { ascending: false }).limit(100);
    const { data: blockedData } = await sb.from("blocked_users").select("user_id");
    const blockedIds = new Set((blockedData || []).map((b: any) => b.user_id));

    const users = [];
    for (const s of settings || []) {
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
        blocked: blockedIds.has(s.user_id),
      });
    }

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
