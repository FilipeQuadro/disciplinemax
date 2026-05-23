import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, buildMorningMessage, buildReminderMessage } from "@/lib/whatsapp";
import { sendTelegramMessage } from "@/lib/telegram";
import { getMotivationalMessage } from "@/lib/ai";
import webpush from "web-push";
import { createApnsProvider, sendApnsNotification } from "@/lib/apns";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

// Dedup em memória — funciona enquanto a instância está quente
const notifCache = new Set<string>();

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearer !== process.env.CRON_SECRET && querySecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // BRT timezone
  const brtFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const brtTime = brtFormatter.format(now);
  const brtHour = parseInt(brtTime.split(":")[0], 10);
  const brtMinute = parseInt(brtTime.split(":")[1], 10);
  const currentMinutes = brtHour * 60 + brtMinute;

  // Buscar dados
  const { data: allSettings } = await supabase.from("user_settings").select("*");
  const { data: allBooks } = await supabase.from("books").select("*");
  const { data: allBibleGoals } = await supabase.from("bible_goals").select("*");
  const { data: allStats } = await supabase
    .from("daily_stats").select("*").eq("date", today);
  const { data: allSubs } = await supabase.from("notification_subscriptions").select("*");

  // VAPID
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      "mailto:app@disciplinaapp.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  const apnsProvider = createApnsProvider();
  const results = [];

  for (const settings of (allSettings || [])) {
    const userId = settings.user_id;
    const userBooks = (allBooks || []).filter((b: any) => b.user_id === userId);
    const bibleGoal = (allBibleGoals || []).find((g: any) => g.user_id === userId);
    const stats = (allStats || []).find((s: any) => s.user_id === userId);

    const totalPagesGoal = userBooks.reduce((s: number, b: any) => s + b.daily_goal, 0);
    const totalPagesRead = userBooks.reduce((s: number, b: any) => s + b.pages_read_today, 0);
    const bibleChaptersRead = stats?.bible_chapters_read || 0;
    const bibleGoalChapters = bibleGoal?.daily_chapters || 0;
    const booksGoalMet = totalPagesRead >= totalPagesGoal;
    const bibleGoalMet = bibleChaptersRead >= bibleGoalChapters;

    if (booksGoalMet && bibleGoalMet) continue;

    // Matching com tolerância de 30 min — se o cron rodar até 29 min depois, dispara
    const notifTimes: string[] = settings.notification_times || ["07:00", "12:00", "19:00"];
    const matchedTime = notifTimes.find((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const notifMinutes = h * 60 + m;
      return currentMinutes >= notifMinutes && currentMinutes < notifMinutes + 30;
    });

    if (!matchedTime) continue;

    // Dedup (in-memory + DB fallback via last_notif_key se a coluna existir)
    const dedupKey = `${userId}_${today}_${matchedTime}`;
    if (notifCache.has(dedupKey)) continue;
    // DB dedup: se last_notif_key existe e bate, pular
    if (settings.last_notif_key === `${today}_${matchedTime}`) continue;

    notifCache.add(dedupKey);

    // Tentar persistir dedup no DB (silently ignora se coluna não existe)
    try {
      await supabase.from("user_settings").update({
        last_notif_key: `${today}_${matchedTime}`,
        updated_at: now.toISOString(),
      } as any).eq("user_id", userId);
    } catch (e) { /* coluna pode não existir ainda */ }

    // Construir mensagem
    const isMorning = brtHour < 9;
    const message = isMorning
      ? buildMorningMessage({
          booksPages: userBooks.map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          bibleChapters: bibleGoalChapters,
          pomodoroGoal: 4,
          motivational: await getMotivationalMessage({ streak: 0, booksRead: 0, bibleChapters: 0, completedToday: false }),
        })
      : buildReminderMessage({
          pendingBooks: userBooks.filter((b: any) => b.pages_read_today < b.daily_goal)
            .map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          biblePending: !bibleGoalMet,
          bibleChaptersLeft: Math.max(0, bibleGoalChapters - bibleChaptersRead),
          hour: brtHour,
        });

    // Telegram
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      try {
        await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, message);
      } catch (e) {
        console.error("Telegram send failed:", e);
      }
    }

    // WhatsApp
    if (settings.whatsapp_number && settings.callmebot_api_key) {
      await sendWhatsAppMessage(settings.whatsapp_number, settings.callmebot_api_key, message);
    }

    // Push notifications
    const userSubs = (allSubs || []).filter((s: any) => s.user_id === userId);
    const pushBody = `Ainda faltam ${totalPagesGoal - totalPagesRead} páginas e ${Math.max(0, bibleGoalChapters - bibleChaptersRead)} capítulos hoje.`;

    for (const sub of userSubs) {
      if (sub.platform === "apns" && sub.device_token && apnsProvider) {
        try {
          await sendApnsNotification(apnsProvider, sub.device_token, {
            title: "🎯 Metas pendentes!", body: pushBody, url: "/",
          });
        } catch (e) {
          await supabase.from("notification_subscriptions").delete().eq("device_token", sub.device_token);
        }
      } else if (sub.platform === "web" && sub.endpoint && sub.p256dh && sub.auth) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: "🎯 Metas pendentes!", body: pushBody, tag: "cron-reminder", requireInteraction: true, url: "/" })
          );
        } catch (e) {
          await supabase.from("notification_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    results.push({ userId, matchedTime });
  }

  return NextResponse.json({ ok: true, processed: results.length, brtTime, results, time: now.toISOString() });
}
