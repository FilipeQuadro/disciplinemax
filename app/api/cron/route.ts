// Rota executada pelo Vercel Cron Jobs (gratuito)
// Configurar em vercel.json: cron a cada hora
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

// Verificar autorização do cron
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

  // Usar timezone BRT para bater com notification_times salvos no banco
  const brtFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const brtTime = brtFormatter.format(now);
  const brtHour = parseInt(brtTime.split(":")[0], 10);
  const brtHHMM = brtTime; // ex: "07:00"

  // Buscar todas as configurações de usuários
  const { data: allSettings } = await supabase.from("user_settings").select("*");
  const { data: allBooks } = await supabase.from("books").select("*");
  const { data: allBibleGoals } = await supabase.from("bible_goals").select("*");
  const { data: allStats } = await supabase
    .from("daily_stats").select("*").eq("date", today);
  const { data: allSubs } = await supabase.from("notification_subscriptions").select("*");

  // Configurar VAPID
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
    const allGoalsMet = booksGoalMet && bibleGoalMet;

    // Se tudo foi feito, não enviar lembretes
    if (allGoalsMet) continue;

    // Decidir tipo de mensagem — comparar em BRT
    let shouldNotify = false;
    let notifTimes = settings.notification_times || ["07:00", "12:00", "19:00"];
    shouldNotify = notifTimes.some((t: string) => t === brtHHMM);

    if (!shouldNotify) continue;

    // Telegram
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      let message = "";
      if (brtHour < 9) {
        const motivation = await getMotivationalMessage({ streak: 0, booksRead: 0, bibleChapters: 0, completedToday: false });
        message = buildMorningMessage({
          booksPages: userBooks.map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          bibleChapters: bibleGoalChapters,
          pomodoroGoal: 4,
          motivational: motivation,
        });
      } else {
        message = buildReminderMessage({
          pendingBooks: userBooks.filter((b: any) => b.pages_read_today < b.daily_goal)
            .map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          biblePending: !bibleGoalMet,
          bibleChaptersLeft: Math.max(0, bibleGoalChapters - bibleChaptersRead),
          hour: brtHour,
        });
      }
      try {
        await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, message);
      } catch (e) {
        console.error("Telegram send failed:", e);
      }
    }

    // WhatsApp
    if (settings.whatsapp_number && settings.callmebot_api_key) {
      let message = "";
      if (brtHour < 9) {
        const motivation = await getMotivationalMessage({ streak: 0, booksRead: 0, bibleChapters: 0, completedToday: false });
        message = buildMorningMessage({
          booksPages: userBooks.map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          bibleChapters: bibleGoalChapters,
          pomodoroGoal: 4,
          motivational: motivation,
        });
      } else {
        message = buildReminderMessage({
          pendingBooks: userBooks.filter((b: any) => b.pages_read_today < b.daily_goal)
            .map((b: any) => ({ title: b.title, pagesLeft: b.daily_goal - b.pages_read_today })),
          biblePending: !bibleGoalMet,
          bibleChaptersLeft: Math.max(0, bibleGoalChapters - bibleChaptersRead),
          hour: brtHour,
        });
      }
      await sendWhatsAppMessage(settings.whatsapp_number, settings.callmebot_api_key, message);
    }

    // Push notifications
    const userSubs = (allSubs || []).filter((s: any) => s.user_id === userId);
    for (const sub of userSubs) {
      if (sub.platform === "apns" && sub.device_token && apnsProvider) {
        try {
          await sendApnsNotification(apnsProvider, sub.device_token, {
            title: "🎯 Metas pendentes!",
            body: `Ainda faltam ${totalPagesGoal - totalPagesRead} páginas e ${Math.max(0, bibleGoalChapters - bibleChaptersRead)} capítulos hoje.`,
            url: "/",
          });
        } catch (e) {
          await supabase.from("notification_subscriptions").delete().eq("device_token", sub.device_token);
        }
      } else if (sub.platform === "web" && sub.endpoint && sub.p256dh && sub.auth) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
              title: "🎯 Metas pendentes!",
              body: `Ainda faltam ${totalPagesGoal - totalPagesRead} páginas e ${Math.max(0, bibleGoalChapters - bibleChaptersRead)} capítulos hoje.`,
              tag: "cron-reminder",
              requireInteraction: true,
              url: "/",
            })
          );
        } catch (e) {
          await supabase.from("notification_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    results.push({ userId, notified: true });
  }

  return NextResponse.json({ ok: true, processed: results.length, time: now.toISOString() });
}
