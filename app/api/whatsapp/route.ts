import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, buildReminderMessage, buildCompletionMessage } from "@/lib/whatsapp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
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
  const { data: allSettings } = await sb.from("user_settings").select("*");
  const today = new Date().toISOString().split("T")[0];
  let sent = 0;

  for (const settings of allSettings || []) {
    if (!settings.whatsapp_number || !settings.callmebot_api_key) continue;
    const userId = settings.user_id;

    const { data: books } = await sb.from("books").select("*").eq("user_id", userId);
    const { data: bibleGoal } = await sb.from("bible_goals").select("*").eq("user_id", userId).maybeSingle();
    const { data: stats } = await sb.from("daily_stats").select("*").eq("user_id", userId).eq("date", today).maybeSingle();

    const userBooks = (books || []).filter((b: any) => b.pages_read_today < b.daily_goal);
    const booksGoalMet = userBooks.length === 0;
    const bibleChaptersRead = stats?.bible_chapters_read || 0;
    const bibleGoalChapters = bibleGoal?.daily_chapters || 0;
    const bibleGoalMet = bibleChaptersRead >= bibleGoalChapters;

    let message: string;
    if (booksGoalMet && bibleGoalMet) {
      message = buildCompletionMessage(stats?.streak_day || 0);
    } else {
      message = buildReminderMessage({
        pendingBooks: userBooks.map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
        biblePending: !bibleGoalMet,
        bibleChaptersLeft: Math.max(0, bibleGoalChapters - bibleChaptersRead),
        hour: new Date().getHours(),
      });
    }

    const result = await sendWhatsAppMessage(settings.whatsapp_number, settings.callmebot_api_key, message);
    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
