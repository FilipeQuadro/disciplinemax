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
    // BRT date
    const brtDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const today = brtDate;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [
      { count: totalUsers },
      { count: activeToday },
      { count: activeThisWeek },
      { count: newThisWeek },
      { count: newThisMonth },
      { data: todayAgg },
      { data: weekAgg },
      { count: freePlan },
      { count: proPlan },
      { count: premiumPlan },
      { count: blockedCount },
      { count: totalBooks },
      { count: totalPomodoroSessions },
      { data: last7Days },
    ] = await Promise.all([
      sb.from("user_settings").select("*", { count: "exact", head: true }),
      sb.from("daily_stats").select("user_id", { count: "exact", head: true }).eq("date", today),
      sb.from("daily_stats").select("user_id", { count: "exact", head: true }).gte("date", weekAgo),
      sb.from("user_settings").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo),
      sb.from("user_settings").select("user_id", { count: "exact", head: true }).gte("created_at", monthAgo),
      sb.from("daily_stats").select("books_pages_read, bible_chapters_read, pomodoros_completed, total_focus_minutes").eq("date", today),
      sb.from("daily_stats").select("books_pages_read, bible_chapters_read, pomodoros_completed, total_focus_minutes").gte("date", weekAgo),
      sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "free"),
      sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "pro"),
      sb.from("user_plans").select("*", { count: "exact", head: true }).eq("plan", "premium"),
      sb.from("blocked_users").select("user_id", { count: "exact", head: true }),
      sb.from("books").select("id", { count: "exact", head: true }),
      sb.from("pomodoro_sessions").select("id", { count: "exact", head: true }).eq("completed", true),
      sb.from("daily_stats").select("date, books_pages_read, bible_chapters_read, pomodoros_completed").gte("date", weekAgo).order("date", { ascending: true }),
    ]);

    // Aggregate today
    const pagesToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.books_pages_read || 0), 0);
    const chaptersToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.bible_chapters_read || 0), 0);
    const pomodorosToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.pomodoros_completed || 0), 0);
    const focusMinToday = (todayAgg || []).reduce((s: number, r: any) => s + (r.total_focus_minutes || 0), 0);

    // Aggregate this week
    const pagesWeek = (weekAgg || []).reduce((s: number, r: any) => s + (r.books_pages_read || 0), 0);
    const chaptersWeek = (weekAgg || []).reduce((s: number, r: any) => s + (r.bible_chapters_read || 0), 0);
    const pomodorosWeek = (weekAgg || []).reduce((s: number, r: any) => s + (r.pomodoros_completed || 0), 0);
    const focusMinWeek = (weekAgg || []).reduce((s: number, r: any) => s + (r.total_focus_minutes || 0), 0);

    // Daily trend (last 7 days) — aggregate per date
    const dailyTrend = new Map<string, { pages: number; chapters: number; pomodoros: number }>();
    for (const r of (last7Days || [])) {
      const existing = dailyTrend.get(r.date) || { pages: 0, chapters: 0, pomodoros: 0 };
      existing.pages += r.books_pages_read || 0;
      existing.chapters += r.bible_chapters_read || 0;
      existing.pomodoros += r.pomodoros_completed || 0;
      dailyTrend.set(r.date, existing);
    }
    const trend = Array.from(dailyTrend.entries()).map(([date, v]) => ({ date, ...v }));

    // Engagement & retention
    const engagementRate = totalUsers ? Math.round(((activeToday ?? 0) / totalUsers) * 100) : 0;
    const weeklyRetention = totalUsers ? Math.round(((activeThisWeek ?? 0) / totalUsers) * 100) : 0;

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        activeToday: activeToday || 0,
        activeThisWeek: activeThisWeek || 0,
        newThisWeek: newThisWeek || 0,
        newThisMonth: newThisMonth || 0,
        blocked: blockedCount || 0,
        engagementRate,
        weeklyRetention,
      },
      metrics: {
        today: { pages: pagesToday, chapters: chaptersToday, pomodoros: pomodorosToday, focusMin: focusMinToday },
        week: { pages: pagesWeek, chapters: chaptersWeek, pomodoros: pomodorosWeek, focusMin: focusMinWeek },
        totalBooks: totalBooks || 0,
        totalPomodoroSessions: totalPomodoroSessions || 0,
      },
      plans: { free: freePlan || 0, pro: proPlan || 0, premium: premiumPlan || 0 },
      trend,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
