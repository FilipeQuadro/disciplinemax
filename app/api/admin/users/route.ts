import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";
import { getAdminUsers } from "@/lib/admin-users-cache";

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
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "50")));
    const search = url.searchParams.get("search")?.trim() || "";

    // 1. Fetch all user IDs + emails via cached Auth Admin API
    const allAuthUsers = await getAdminUsers();

    const emailMap = new Map<string, string>();
    const nameMap = new Map<string, string>();
    for (const u of allAuthUsers) {
      emailMap.set(u.id, u.email || "");
      nameMap.set(u.id, u.user_metadata?.name || "");
    }

    // 2. Fetch related data in parallel (no N+1)
    const [
      { data: blockedData },
      { data: allBooks },
      { data: allPomodoros },
      { data: allPlans },
      { data: allStats },
      { data: allAdmins },
    ] = await Promise.all([
      sb.from("blocked_users").select("user_id, reason, blocked_by, created_at"),
      sb.from("books").select("user_id, id"),
      sb.from("pomodoro_sessions").select("user_id, id").eq("completed", true),
      sb.from("user_plans").select("user_id, plan"),
      sb.from("daily_stats").select("user_id, date, goals_completed, books_pages_read, bible_chapters_read, pomodoros_completed, total_focus_minutes").order("date", { ascending: false }),
      sb.from("admin_users").select("user_id, role"),
    ]);

    // 3. Build lookup maps
    const blockedMap = new Map<string, { reason: string; blocked_by: string | null; created_at: string }>();
    for (const b of (blockedData || [])) {
      blockedMap.set(b.user_id, { reason: b.reason, blocked_by: b.blocked_by, created_at: b.created_at });
    }

    const adminMap = new Map<string, string>();
    for (const a of (allAdmins || [])) {
      adminMap.set(a.user_id, a.role || "admin");
    }

    const bookCountMap = new Map<string, number>();
    for (const b of (allBooks || [])) {
      bookCountMap.set(b.user_id, (bookCountMap.get(b.user_id) || 0) + 1);
    }

    const pomodoroCountMap = new Map<string, number>();
    for (const p of (allPomodoros || [])) {
      pomodoroCountMap.set(p.user_id, (pomodoroCountMap.get(p.user_id) || 0) + 1);
    }

    const planMap = new Map<string, string>();
    for (const p of (allPlans || [])) {
      planMap.set(p.user_id, p.plan || "free");
    }

    // Last active date + streak per user
    const lastActiveMap = new Map<string, string>();
    const streakMap = new Map<string, number>();
    const userStatsMap = new Map<string, any[]>();
    const totalPagesMap = new Map<string, number>();
    const totalChaptersMap = new Map<string, number>();
    const totalPomodoroMinMap = new Map<string, number>();

    for (const s of (allStats || [])) {
      if (!lastActiveMap.has(s.user_id)) {
        lastActiveMap.set(s.user_id, s.date);
      }
      if (!userStatsMap.has(s.user_id)) userStatsMap.set(s.user_id, []);
      userStatsMap.get(s.user_id)!.push(s);

      totalPagesMap.set(s.user_id, (totalPagesMap.get(s.user_id) || 0) + (s.books_pages_read || 0));
      totalChaptersMap.set(s.user_id, (totalChaptersMap.get(s.user_id) || 0) + (s.bible_chapters_read || 0));
      totalPomodoroMinMap.set(s.user_id, (totalPomodoroMinMap.get(s.user_id) || 0) + (s.total_focus_minutes || 0));
    }

    userStatsMap.forEach((stats, uid) => {
      let streak = 0;
      for (const s of stats) {
        if (s.goals_completed) streak++;
        else break;
      }
      streakMap.set(uid, streak);
    });

    // 4. Build user rows from auth.users (not user_settings) so no user is missed
    const allUsers = allAuthUsers.map((u) => {
      const blocked = blockedMap.get(u.id);
      return {
        id: u.id,
        email: emailMap.get(u.id) || "",
        name: nameMap.get(u.id) || "",
        joinedAt: u.created_at,
        lastActive: lastActiveMap.get(u.id) || null,
        books: bookCountMap.get(u.id) || 0,
        pomodoros: pomodoroCountMap.get(u.id) || 0,
        plan: planMap.get(u.id) || "free",
        blocked: !!blocked,
        blockedReason: blocked?.reason || null,
        isAdmin: adminMap.has(u.id),
        adminRole: adminMap.get(u.id) || null,
        streak: streakMap.get(u.id) || 0,
        totalPages: totalPagesMap.get(u.id) || 0,
        totalChapters: totalChaptersMap.get(u.id) || 0,
        totalFocusMin: totalPomodoroMinMap.get(u.id) || 0,
      };
    });

    // 5. Search filter
    const filtered = search
      ? allUsers.filter((u) => {
          const q = search.toLowerCase();
          return u.email.toLowerCase().includes(q) ||
            u.name.toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q) ||
            u.plan.toLowerCase().includes(q);
        })
      : allUsers;

    // 6. Paginate
    const total = filtered.length;
    const start = (page - 1) * perPage;
    const users = filtered.slice(start, start + perPage);

    return NextResponse.json({
      users,
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
