import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, buildReminderMessage, buildCompletionMessage } from "@/lib/whatsapp";
import { verifyCronSecret } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In-memory dedup — same pattern as main cron
const notifCache = new Set<string>();

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: allSettings } = await sb.from("user_settings").select("*");
  const today = new Date().toISOString().split("T")[0];

  // BRT timezone — only send if within a notification time window
  const brtFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const brtTime = brtFormatter.format(new Date());
  const brtHour = parseInt(brtTime.split(":")[0], 10);
  const currentMinutes = brtHour * 60 + parseInt(brtTime.split(":")[1], 10);

  let sent = 0;

  for (const settings of allSettings || []) {
    if (!settings.greenapi_instance_id || !settings.greenapi_token || !settings.whatsapp_number) continue;
    const userId = settings.user_id;

    // Check if current time matches any of the user's notification times (30-min tolerance)
    const notifTimes: string[] = settings.notification_times || ["07:00", "12:00", "19:00"];
    const matched = notifTimes.find((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const nm = h * 60 + m;
      return currentMinutes >= nm && currentMinutes < nm + 30;
    });
    if (!matched) continue;

    // Dedup — same pattern as main cron route
    const dedupKey = `${userId}_${today}_${matched}`;
    if (notifCache.has(dedupKey)) continue;

    const { data: alreadySent } = await sb
      .from("notifications_sent")
      .select("id")
      .eq("user_id", userId)
      .eq("notif_key", `${today}_${matched}`)
      .maybeSingle();
    if (alreadySent) { notifCache.add(dedupKey); continue; }

    notifCache.add(dedupKey);

    try {
      await sb.from("notifications_sent").insert({
        user_id: userId,
        notif_key: `${today}_${matched}`,
      } as any);
    } catch { /* UNIQUE constraint */ }

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

    const result = await sendWhatsAppMessage(
      settings.greenapi_instance_id,
      settings.greenapi_token,
      settings.whatsapp_number,
      message
    );
    if (result.ok) sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
