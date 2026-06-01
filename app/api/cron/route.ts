import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { getMotivationalMessage, getBibleVerseOfDay } from "@/lib/ai";
import { sendWebPush, cleanupExpiredSubscriptions } from "@/lib/web-push-server";
import { verifyCronSecret } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

// Dedup em memória — funciona enquanto a instância está quente
const notifCache = new Set<string>();

// Prune the dedup cache every 30 minutes to prevent unbounded growth
let lastCachePrune = Date.now();
const CACHE_PRUNE_INTERVAL = 30 * 60 * 1000; // 30 min
function pruneCache() {
  const now = Date.now();
  if (now - lastCachePrune > CACHE_PRUNE_INTERVAL) {
    notifCache.clear();
    lastCachePrune = now;
  }
}

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // CRON_SECRET — accept Bearer header OR ?secret= query param (cron-job.org sends query)
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  pruneCache();

  const now = new Date();

  // BRT timezone
  const brtFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const brtTime = brtFormatter.format(now);
  const brtHour = parseInt(brtTime.split(":")[0], 10);
  const currentMinutes = brtHour * 60 + parseInt(brtTime.split(":")[1], 10);

  // Use BRT date for today (not UTC) to avoid midnight mismatch
  const brtDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
  const today = brtDate;

  // Limpar notifications_sent antigos (> 7 dias)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("notifications_sent").delete().lt("sent_at", sevenDaysAgo);

  // Daily reset: reset pages_read_today for all books if it's midnight BRT (00:00–00:30)
  if (brtHour === 0 && currentMinutes < 30) {
    try {
      const { error: resetErr } = await supabase.from("books").update({ pages_read_today: 0 }).neq("pages_read_today", 0);
      if (resetErr) console.error("Daily pages reset failed:", resetErr);
      else console.log("Daily pages_read_today reset done at", brtTime);
    } catch (e) {
      console.error("Daily pages reset error:", e);
    }
  }

  // Buscar dados
  const { data: allSettings } = await supabase.from("user_settings").select("*");
  const { data: allBooks } = await supabase.from("books").select("*");
  const { data: allBibleGoals } = await supabase.from("bible_goals").select("*");
  const { data: allStats } = await supabase
    .from("daily_stats").select("*").eq("date", today);

  let telegramSent = 0;
  let whatsappSent = 0;
  let pushSent = 0;
  let skipped = 0;

  // Fetch verse once (truly same for all users)
  const isMorning = brtHour < 12;
  const verse = await getBibleVerseOfDay();

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

    // Matching com tolerância de 30 min
    const notifTimes: string[] = settings.notification_times || ["07:00", "12:00", "19:00"];
    const matchedTime = notifTimes.find((t: string) => {
      const [h, m] = t.split(":").map(Number);
      const notifMinutes = h * 60 + m;
      return currentMinutes >= notifMinutes && currentMinutes < notifMinutes + 30;
    });

    if (!matchedTime) { skipped++; continue; }

    // Dedup persistente
    const dedupKey = `${userId}_${today}_${matchedTime}`;
    if (notifCache.has(dedupKey)) { skipped++; continue; }

    const { data: alreadySent } = await supabase
      .from("notifications_sent")
      .select("id")
      .eq("user_id", userId)
      .eq("notif_key", `${today}_${matchedTime}`)
      .maybeSingle();
    if (alreadySent) { notifCache.add(dedupKey); skipped++; continue; }

    notifCache.add(dedupKey);

    // Persistir dedup
    try {
      await supabase.from("notifications_sent").insert({
        user_id: userId,
        notif_key: `${today}_${matchedTime}`,
      } as any);
    } catch { /* UNIQUE constraint */ }

    // ========== Construir mensagem ==========
    const motivational = await getMotivationalMessage({
      streak: stats?.streak_day || 0,
      booksRead: totalPagesRead,
      bibleChapters: bibleChaptersRead,
      completedToday: booksGoalMet && bibleGoalMet,
    });

    // Telegram message (Markdown format)
    let tgMessage = "";

    if (isMorning) {
      tgMessage = `☀️ *Bom dia! Hora de buscar o Senhor!*\n\n`;

      if (userBooks.length > 0) {
        tgMessage += `📚 *Metas de leitura hoje:*\n`;
        for (const b of userBooks) {
          const pagesLeft = b.daily_goal - b.pages_read_today;
          tgMessage += `• ${b.title}: ${pagesLeft} páginas\n`;
        }
        tgMessage += `\n`;
      }

      if (bibleGoalChapters > 0) {
        tgMessage += `✝️ *Bíblia:* ${bibleGoalChapters} capítulo(s) — ${bibleGoal?.current_book || ""} ${bibleGoal?.current_chapter || 1}\n\n`;
      }

      tgMessage += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      tgMessage += `💡 _${motivational}_\n\n`;
      tgMessage += `👉 disciplinemax.onrender.com`;
    } else if (booksGoalMet && bibleGoalMet) {
      tgMessage = `🎉 *Parabéns! Você completou todas as metas de hoje!* 🎉\n\n`;
      tgMessage += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      tgMessage += `💪 Continue firme amanhã!`;
    } else {
      const timeEmoji = brtHour < 18 ? "☀️" : "🌙";
      tgMessage = `${timeEmoji} *Lembrete — ainda faltam metas hoje!*\n\n`;

      const pendingBooks = userBooks.filter((b: any) => b.pages_read_today < b.daily_goal);
      if (pendingBooks.length > 0) {
        tgMessage += `📖 *Livros pendentes:*\n`;
        for (const b of pendingBooks) {
          const pagesLeft = b.daily_goal - b.pages_read_today;
          tgMessage += `• ${b.title}: ${pagesLeft} páginas\n`;
        }
        tgMessage += `\n`;
      }

      if (!bibleGoalMet && bibleGoalChapters > 0) {
        const chaptersLeft = Math.max(0, bibleGoalChapters - bibleChaptersRead);
        tgMessage += `✝️ *Bíblia:* ${chaptersLeft} capítulo(s) restante(s)\n\n`;
      }

      tgMessage += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      tgMessage += `💪 _${motivational}_\n\n`;
      tgMessage += `👉 disciplinemax.onrender.com`;
    }

    // WhatsApp message (plain text with bold — Green-API supports WhatsApp formatting)
    let waMessage = "";
    if (booksGoalMet && bibleGoalMet) {
      waMessage = `🎉 *Parabéns! Todas as metas de hoje foram cumpridas!*\n\n📜 "${verse.verse}" — ${verse.reference}\n\n💪 Continue firme amanhã!`;
    } else {
      const timeEmoji = brtHour < 12 ? "☀️" : brtHour < 18 ? "☀️" : "🌙";
      waMessage = `${timeEmoji} *Lembrete DisciplinaMax*\n\nAinda faltam completar:\n\n`;

      const pendingBooks = userBooks.filter((b: any) => b.pages_read_today < b.daily_goal);
      for (const b of pendingBooks) {
        waMessage += `📖 ${b.title}: *${b.daily_goal - b.pages_read_today}* páginas\n`;
      }

      if (!bibleGoalMet && bibleGoalChapters > 0) {
        waMessage += `✝️ Bíblia: *${Math.max(0, bibleGoalChapters - bibleChaptersRead)}* capítulos\n`;
      }

      waMessage += `\n📜 "${verse.verse}" — ${verse.reference}\n\n💪 ${motivational}\n\n👉 disciplinemax.onrender.com`;
    }

    // ── Enviar Telegram ──
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      try {
        const tgResult = await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, tgMessage);
        if (tgResult.ok) telegramSent++;
        else console.error("Telegram send failed:", tgResult.error);
      } catch (e) {
        console.error("Telegram send failed:", e);
      }
    }

    // ── Enviar WhatsApp (Green-API) ──
    if (settings.greenapi_instance_id && settings.greenapi_token && settings.whatsapp_number) {
      try {
        const waResult = await sendWhatsAppMessage(
          settings.greenapi_instance_id,
          settings.greenapi_token,
          settings.whatsapp_number,
          waMessage
        );
        if (waResult.ok) whatsappSent++;
      } catch (e) {
        console.error("WhatsApp send failed:", e);
      }
    }

    // ── Enviar Web Push (browser notifications even when tab is closed) ──
    try {
      const { data: subs } = await supabase
        .from("notification_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId)
        .eq("platform", "web");
      if (subs && subs.length > 0) {
        const pushBody = booksGoalMet && bibleGoalMet
          ? "🎉 Parabéns! Todas as metas de hoje foram cumpridas!"
          : `🎯 Metas pendentes! ${!booksGoalMet ? `📚 ${totalPagesGoal - totalPagesRead} páginas` : ""}${!booksGoalMet && !bibleGoalMet ? " · " : ""}${!bibleGoalMet ? `✝️ ${Math.max(0, bibleGoalChapters - bibleChaptersRead)} capítulos` : ""}`;
        const pushResult = await sendWebPush(subs, {
          title: booksGoalMet && bibleGoalMet ? "🎉 Metas cumpridas!" : "🎯 Metas pendentes!",
          body: pushBody,
          tag: "disciplina-reminder",
        });
        pushSent += pushResult.sent;
        // Clean up expired subscriptions
        if (pushResult.expiredEndpoints.length > 0) {
          await cleanupExpiredSubscriptions(supabase, pushResult.expiredEndpoints);
        }
      }
    } catch (e) {
      console.error("Web Push send failed:", e);
    }
  }

  return NextResponse.json({ ok: true, telegramSent, whatsappSent, pushSent, skipped, brtTime });
}
