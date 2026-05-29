import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { getMotivationalMessage, getBibleVerseOfDay } from "@/lib/ai";
import { sendWebPush } from "@/lib/web-push-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null as any;

// Dedup em memória — funciona enquanto a instância está quente
const notifCache = new Set<string>();

export async function GET(req: Request) {
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // CRON_SECRET — accept Bearer header OR ?secret= query param (cron-job.org sends query)
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const authHeader = req.headers.get("authorization");
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

  // Limpar notifications_sent antigos (> 7 dias)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("notifications_sent").delete().lt("sent_at", sevenDaysAgo);

  // Buscar dados
  const { data: allSettings } = await supabase.from("user_settings").select("*");
  const { data: allBooks } = await supabase.from("books").select("*");
  const { data: allBibleGoals } = await supabase.from("bible_goals").select("*");
  const { data: allStats } = await supabase
    .from("daily_stats").select("*").eq("date", today);

  let sent = 0;
  let skipped = 0;

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

    // ========== Construir mensagem do Telegram ==========
    const isMorning = brtHour < 12;
    const verse = await getBibleVerseOfDay();
    const motivational = await getMotivationalMessage({
      streak: stats?.streak_day || 0,
      booksRead: totalPagesRead,
      bibleChapters: bibleChaptersRead,
      completedToday: booksGoalMet && bibleGoalMet,
    });

    let message = "";

    if (isMorning) {
      // Mensagem matinal — metas do dia + versículo
      message = `☀️ *Bom dia! Hora de buscar o Senhor!*\n\n`;

      if (userBooks.length > 0) {
        message += `📚 *Metas de leitura hoje:*\n`;
        for (const b of userBooks) {
          const pagesLeft = b.daily_goal - b.pages_read_today;
          message += `• ${b.title}: ${pagesLeft} páginas\n`;
        }
        message += `\n`;
      }

      if (bibleGoalChapters > 0) {
        message += `✝️ *Bíblia:* ${bibleGoalChapters} capítulo(s) — ${bibleGoal?.current_book || ""} ${bibleGoal?.current_chapter || 1}\n\n`;
      }

      message += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      message += `💡 _${motivational}_\n\n`;
      message += `👉 disciplinemax.onrender.com`;
    } else if (booksGoalMet && bibleGoalMet) {
      // Metas completadas
      message = `🎉 *Parabéns! Você completou todas as metas de hoje!* 🎉\n\n`;
      message += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      message += `💪 Continue firme amanhã!`;
    } else {
      // Lembrete — ainda faltam metas
      const timeEmoji = brtHour < 18 ? "☀️" : "🌙";
      message = `${timeEmoji} *Lembrete — ainda faltam metas hoje!*\n\n`;

      const pendingBooks = userBooks.filter((b: any) => b.pages_read_today < b.daily_goal);
      if (pendingBooks.length > 0) {
        message += `📖 *Livros pendentes:*\n`;
        for (const b of pendingBooks) {
          const pagesLeft = b.daily_goal - b.pages_read_today;
          message += `• ${b.title}: ${pagesLeft} páginas\n`;
        }
        message += `\n`;
      }

      if (!bibleGoalMet && bibleGoalChapters > 0) {
        const chaptersLeft = Math.max(0, bibleGoalChapters - bibleChaptersRead);
        message += `✝️ *Bíblia:* ${chaptersLeft} capítulo(s) restante(s)\n\n`;
      }

      message += `📜 _"${verse.verse}"_ — ${verse.reference}\n\n`;
      message += `💪 _${motivational}_\n\n`;
      message += `👉 disciplinemax.onrender.com`;
    }

    // Enviar Telegram
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      try {
        await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, message);
        sent++;
      } catch (e) {
        console.error("Telegram send failed:", e);
      }
    }

    // Enviar Web Push (browser notifications even when tab is closed)
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
        await sendWebPush(subs, {
          title: booksGoalMet && bibleGoalMet ? "🎉 Metas cumpridas!" : "🎯 Metas pendentes!",
          body: pushBody,
          tag: "disciplina-reminder",
        });
      }
    } catch (e) {
      console.error("Web Push send failed:", e);
    }
  }

  // Resposta mínima para evitar "Response data too big" do cron-job.org
  return NextResponse.json({ ok: true, sent, skipped, brtTime });
}
