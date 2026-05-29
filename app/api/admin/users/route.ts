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
    // Fetch all data in parallel — avoids N+1
    const [
      { data: settings },
      { data: blockedData },
      { data: allBooks },
      { data: allPomodoros },
      { data: allPlans },
      { data: allStats },
      { data: allAdmins },
    ] = await Promise.all([
      sb.from("user_settings").select("user_id, created_at, whatsapp_number, telegram_chat_id").order("created_at", { ascending: false }).limit(200),
      sb.from("blocked_users").select("user_id"),
      sb.from("books").select("user_id, id"),
      sb.from("pomodoro_sessions").select("user_id, id").eq("completed", true),
      sb.from("user_plans").select("user_id, plan"),
      sb.from("daily_stats").select("user_id, date, goals_completed").order("date", { ascending: false }),
      sb.from("admin_users").select("user_id, role"),
    ]);

    const blockedIds = new Set((blockedData || []).map((b: any) => b.user_id));
    const adminMap = new Map((allAdmins || []).map((a: any) => [a.user_id, a.role]));

    // Build lookup maps
    const bookCountMap = new Map<string, number>();
    for (const b of allBooks || []) {
      bookCountMap.set(b.user_id, (bookCountMap.get(b.user_id) || 0) + 1);
    }

    const pomodoroCountMap = new Map<string, number>();
    for (const p of allPomodoros || []) {
      pomodoroCountMap.set(p.user_id, (pomodoroCountMap.get(p.user_id) || 0) + 1);
    }

    const planMap = new Map<string, string>();
    for (const p of allPlans || []) {
      planMap.set(p.user_id, p.plan || "free");
    }

    // Last active = most recent daily_stats date per user
    const lastActiveMap = new Map<string, string>();
    for (const s of allStats || []) {
      if (!lastActiveMap.has(s.user_id)) {
        lastActiveMap.set(s.user_id, s.date);
      }
    }

    // Streak per user
    const streakMap = new Map<string, number>();
    const userStatsMap = new Map<string, any[]>();
    for (const s of allStats || []) {
      if (!userStatsMap.has(s.user_id)) userStatsMap.set(s.user_id, []);
      userStatsMap.get(s.user_id)!.push(s);
    }
    userStatsMap.forEach((stats, uid) => {
      let streak = 0;
      for (const s of stats) {
        if (s.goals_completed) streak++;
        else break;
      }
      streakMap.set(uid, streak);
    });

    const users = (settings || []).map((s: any) => ({
      id: s.user_id,
      joinedAt: s.created_at,
      lastActive: lastActiveMap.get(s.user_id) || null,
      books: bookCountMap.get(s.user_id) || 0,
      pomodoros: pomodoroCountMap.get(s.user_id) || 0,
      plan: planMap.get(s.user_id) || "free",
      blocked: blockedIds.has(s.user_id),
      isAdmin: adminMap.has(s.user_id),
      adminRole: adminMap.get(s.user_id) || null,
      streak: streakMap.get(s.user_id) || 0,
    }));

    return NextResponse.json({ users });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
