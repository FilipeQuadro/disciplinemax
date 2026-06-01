import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWebPush, cleanupExpiredSubscriptions } from "@/lib/web-push-server";
import { verifyCronSecret } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(req: Request) {
  if (!sb) return NextResponse.json({ ok: false }, { status: 500 });

  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);

  const { data: allSettings } = await sb.from("user_settings").select("*");

  let telegramSent = 0;
  let pushSent = 0;

  for (const settings of allSettings || []) {
    const userId = settings.user_id;

    const { data: weekStats } = await sb
      .from("daily_stats")
      .select("*")
      .eq("user_id", userId)
      .gte("date", weekAgoStr)
      .lte("date", todayStr);

    const { data: books } = await sb.from("books").select("*").eq("user_id", userId);

    const { data: bibleReadings } = await sb
      .from("bible_readings")
      .select("id")
      .eq("user_id", userId)
      .gte("read_at", weekAgoStr);

    const { data: pomodoros } = await sb
      .from("pomodoro_sessions")
      .select("duration_minutes")
      .eq("user_id", userId)
      .eq("completed", true)
      .gte("started_at", weekAgoStr);

    const totalPages = (weekStats || []).reduce((s: number, d: any) => s + (d.books_pages_read || 0), 0);
    const totalChapters = (weekStats || []).reduce((s: number, d: any) => s + (d.bible_chapters_read || 0), 0);
    const totalPomodoros = (pomodoros || []).length;
    const totalFocusMin = (pomodoros || []).reduce((s: number, p: any) => s + (p.duration_minutes || 0), 0);
    const daysCompleted = (weekStats || []).filter((d: any) => d.goals_completed).length;
    const booksFinished = (books || []).filter((b: any) => b.current_page >= b.total_pages).length;

    const { data: recentStats } = await sb
      .from("daily_stats")
      .select("date, goals_completed")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(30);
    let streak = 0;
    if (recentStats) {
      for (const stat of recentStats as any[]) {
        if (stat.goals_completed) streak++;
        else break;
      }
    }

    const rating = daysCompleted >= 6 ? "🌟🌟🌟" : daysCompleted >= 4 ? "🌟🌟" : daysCompleted >= 2 ? "🌟" : "💪 continue firme!";
    const activeBooks = (books || []).filter((b: any) => b.current_page < b.total_pages);

    // ── Telegram ──
    if (settings.telegram_bot_token && settings.telegram_chat_id) {
      let message = `📊 *Relatório Semanal — DisciplinaMax*\n\n`;
      message += `📅 Período: última semana\n\n`;
      message += `📚 *Páginas lidas:* ${totalPages}\n`;
      message += `📖 *Livros concluídos:* ${booksFinished}\n`;
      message += `✝️ *Capítulos bíblicos:* ${totalChapters}\n`;
      message += `🍅 *Pomodoros:* ${totalPomodoros} (${totalFocusMin} min de foco)\n`;
      message += `✅ *Dias com metas cumpridas:* ${daysCompleted}/7\n\n`;
      message += `🔥 *Streak atual:* ${streak} dias\n\n`;
      message += `Avaliação da semana: ${rating}\n\n`;

      if (activeBooks.length > 0) {
        message += `📖 *Livros em progresso:*\n`;
        for (const b of activeBooks.slice(0, 3)) {
          const pct = Math.round(((b as any).current_page / (b as any).total_pages) * 100);
          message += `• ${(b as any).title}: ${pct}%\n`;
        }
        message += `\n`;
      }

      message += `👉 disciplinemax.onrender.com`;

      try {
        await sendTelegramMessage(settings.telegram_bot_token, settings.telegram_chat_id, message);
        telegramSent++;
      } catch (e) {
        console.error("Weekly report failed for", userId, e);
      }
    }

    // ── Web Push ──
    try {
      const { data: subs } = await sb
        .from("notification_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId)
        .eq("platform", "web");
      if (subs && subs.length > 0) {
        const pushResult = await sendWebPush(subs, {
          title: "📊 Relatório Semanal",
          body: `${daysCompleted}/7 dias cumpridos · ${totalPages} págs · 🔥 ${streak} dias streak`,
          tag: "disciplina-weekly",
        });
        pushSent += pushResult.sent;
        if (pushResult.expiredEndpoints.length > 0) {
          await cleanupExpiredSubscriptions(sb, pushResult.expiredEndpoints);
        }
      }
    } catch (e) {
      console.error("Weekly Web Push failed for", userId, e);
    }
  }

  return NextResponse.json({ ok: true, telegramSent, pushSent, date: todayStr });
}
