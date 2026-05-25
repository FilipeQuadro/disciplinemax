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

  // Allow via CRON_SECRET or Bearer token
  if (bearer !== process.env.CRON_SECRET && querySecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Total users from auth.users not available via client — use user_settings as proxy
    const { count: totalUsers } = await sb.from("user_settings").select("*", { count: "exact", head: true });
    const { count: activeToday } = await sb.from("daily_stats").select("user_id", { count: "exact", head: true }).eq("date", today);
    const { count: newThisWeek } = await sb.from("user_settings").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo);

    // Aggregate metrics
    const { data: todayAgg } = await sb.from("daily_stats").select("books_pages_read, bible_chapters_read, pomodoros_completed").eq("date", today);
    const pagesToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.books_pages_read || 0), 0);
    const chaptersToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.bible_chapters_read || 0), 0);
    const pomodorosToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.pomodoros_completed || 0), 0);

    // Plan distribution
    const { count: freePlan } = await sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "free");
    const { count: proPlan } = await sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "pro");
    const { count: premiumPlan } = await sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "premium");

    return NextResponse.json({
      users: { total: totalUsers || 0, activeToday: activeToday || 0, newThisWeek: newThisWeek || 0 },
      metrics: { pagesToday, chaptersToday, pomodorosToday },
      plans: { free: freePlan || 0, pro: proPlan || 0, premium: premiumPlan || 0 },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
