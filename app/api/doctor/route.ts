import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report: {
    timestamp: string;
    ok: boolean;
    services: Record<string, { ok: boolean; detail?: string; latency_ms?: number }>;
    issues: string[];
    notifications: { telegram: boolean; push: boolean };
  } = {
    timestamp: new Date().toISOString(),
    ok: true,
    services: {},
    issues: [],
    notifications: { telegram: false, push: false },
  };

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }
  const sb = createClient(supabaseUrl, supabaseKey);

  // 1. Supabase — all 8 tables
  const tables = [
    "books", "bible_goals", "bible_readings", "daily_stats",
    "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent",
  ];
  const tableStatus: Record<string, boolean> = {};
  for (const t of tables) {
    try {
      const { error } = await sb.from(t).select("id").limit(1);
      tableStatus[t] = !error;
    } catch {
      tableStatus[t] = false;
    }
  }
  const supabaseOk = Object.values(tableStatus).every(Boolean);
  report.services.supabase = { ok: supabaseOk, detail: JSON.stringify(tableStatus) };
  if (!supabaseOk) {
    report.issues.push(`Supabase tables down: ${Object.entries(tableStatus).filter(([, v]) => !v).map(([k]) => k).join(", ")}`);
  }

  // 2. Gemini AI
  const geminiStart = Date.now();
  try {
    const apiKey = process.env.GEMINI_API_KEY ||
      (await sb.from("user_settings").select("gemini_api_key").limit(1).maybeSingle()).data?.gemini_api_key;
    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
        }
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      report.services.gemini = {
        ok: !!text,
        detail: text ? "responding" : (data.error?.message || "null response"),
        latency_ms: Date.now() - geminiStart,
      };
      if (!text) report.issues.push(`Gemini: ${data.error?.message || "null response"}`);
    } else {
      report.services.gemini = { ok: false, detail: "No API key" };
      report.issues.push("Gemini: no API key configured");
    }
  } catch (e: any) {
    report.services.gemini = { ok: false, detail: e.message, latency_ms: Date.now() - geminiStart };
    report.issues.push(`Gemini: ${e.message}`);
  }

  // 3. Telegram
  const tgStart = Date.now();
  try {
    const { data: settings } = await sb.from("user_settings").select("telegram_bot_token, telegram_chat_id").limit(1).maybeSingle();
    if (settings?.telegram_bot_token) {
      const res = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/getMe`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      report.services.telegram = {
        ok: data.ok === true,
        detail: data.ok ? `@${data.result.username}` : data.description,
        latency_ms: Date.now() - tgStart,
      };
      report.notifications.telegram = data.ok === true;
      if (!data.ok) report.issues.push(`Telegram: ${data.description}`);
    } else {
      report.services.telegram = { ok: false, detail: "No bot token" };
      report.issues.push("Telegram: no bot token configured");
    }
  } catch (e: any) {
    report.services.telegram = { ok: false, detail: e.message, latency_ms: Date.now() - tgStart };
    report.issues.push(`Telegram: ${e.message}`);
  }

  // 4. Push notifications
  try {
    const { count } = await sb.from("notification_subscriptions").select("*", { count: "exact", head: true });
    report.notifications.push = (count ?? 0) > 0;
    report.services.push = { ok: true, detail: `${count ?? 0} subscriptions` };
  } catch {
    report.services.push = { ok: false, detail: "cannot query" };
  }

  // 5. Cron — last execution
  try {
    const { data: notifs } = await sb
      .from("notifications_sent")
      .select("sent_at")
      .order("sent_at", { ascending: false })
      .limit(1);
    const lastNotif = notifs?.[0]?.sent_at || null;
    report.services.cron = {
      ok: true,
      detail: lastNotif ? `last: ${lastNotif}` : "no notifications yet",
    };
    // Alert if no notifications in 48h
    if (lastNotif) {
      const hoursSinceLast = (Date.now() - new Date(lastNotif).getTime()) / 3600000;
      if (hoursSinceLast > 48) {
        report.issues.push(`Cron: last notification was ${Math.round(hoursSinceLast)}h ago (>48h)`);
      }
    }
  } catch {
    report.services.cron = { ok: false, detail: "cannot query" };
  }

  // 6. Data integrity checks
  // Stale daily pages (not reset)
  try {
    const { data: staleBooks } = await sb.from("books").select("id,title,pages_read_today").gt("pages_read_today", 0);
    if (staleBooks && staleBooks.length > 0) {
      // Check if there's a daily_stats for today — if not, pages haven't been saved
      const today = new Date().toISOString().split("T")[0];
      const { data: todayStats } = await sb.from("daily_stats").select("id").eq("date", today).limit(1);
      // This is informational, not an error
      report.services.data_integrity = {
        ok: true,
        detail: `${staleBooks.length} books with pages_read_today > 0, today stats: ${todayStats?.length ?? 0}`,
      };
    } else {
      report.services.data_integrity = { ok: true, detail: "clean" };
    }
  } catch {
    report.services.data_integrity = { ok: true, detail: "check skipped" };
  }

  // 7. Ollama (won't work on Render, but check anyway)
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    report.services.ollama = { ok: true, detail: data.models?.map((m: any) => m.name).join(", ") || "no models" };
  } catch {
    report.services.ollama = { ok: false, detail: "not running" };
  }

  // Final status
  const criticalServices = ["supabase", "cron"];
  report.ok = criticalServices.every((s) => report.services[s]?.ok);

  // Send Telegram alert if issues found
  if (report.issues.length > 0) {
    try {
      const { data: settings } = await sb.from("user_settings").select("telegram_bot_token, telegram_chat_id").limit(1).maybeSingle();
      if (settings?.telegram_bot_token && settings?.telegram_chat_id) {
        const alertMsg = `🚨 *DisciplinaMax Auto-Diagnóstico*\n\n❌ ${report.issues.length} problema(s) encontrado(s):\n${report.issues.map((i) => `• ${i}`).join("\n")}\n\n⏰ ${report.timestamp}`;
        await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: settings.telegram_chat_id, text: alertMsg, parse_mode: "Markdown" }),
        });
      }
    } catch { /* don't fail the diagnostic if alert fails */ }
  }

  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
