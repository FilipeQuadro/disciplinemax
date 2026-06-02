import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get("detailed") !== null;

  // Public health check — just verify the server is alive
  // This allows Render uptime monitoring without auth
  if (!detailed) {
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      service: "DisciplinaMax",
    });
  }

  // Detailed health check requires admin auth
  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; detail?: string; latency_ms?: number }> = {};

  // 1. Supabase — verificar todas as tabelas
  if (supabaseUrl && supabaseKey) {
    const sb = createClient(supabaseUrl, supabaseKey);
    const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent"];
    const tableResults: Record<string, boolean> = {};

    for (const t of tables) {
      const start = Date.now();
      try {
        const { error } = await sb.from(t).select("id").limit(1);
        tableResults[t] = !error;
      } catch {
        tableResults[t] = false;
      }
    }
    const allOk = Object.values(tableResults).every(Boolean);
    results.supabase = { ok: allOk, detail: JSON.stringify(tableResults) };
  } else {
    results.supabase = { ok: false, detail: "No credentials" };
  }

  // 2. Gemini AI
  const geminiStart = Date.now();
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
        },
        15_000
      );
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      results.gemini = {
        ok: !!text,
        detail: text ? "responding" : (data.error?.message || "null response"),
        latency_ms: Date.now() - geminiStart,
      };
    } else {
      // Try from DB
      const sb = createClient(supabaseUrl!, supabaseKey!);
      const { data } = await sb.from("user_settings").select("gemini_api_key").limit(1).maybeSingle();
      if (data?.gemini_api_key) {
        const res = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${data.gemini_api_key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "ping" }] }],
              generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
            }),
          },
          15_000
        );
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || null;
        results.gemini = {
          ok: !!text,
          detail: text ? "responding (key from DB)" : (d.error?.message || "null response"),
          latency_ms: Date.now() - geminiStart,
        };
      } else {
        results.gemini = { ok: false, detail: "No API key configured" };
      }
    }
  } catch (e: any) {
    results.gemini = { ok: false, detail: e.message, latency_ms: Date.now() - geminiStart };
  }

  // 3. Ollama (local)
  const ollamaStart = Date.now();
  try {
    const res = await fetchWithTimeout("http://localhost:11434/api/tags", {}, 3_000);
    const data = await res.json();
    const models = data.models?.map((m: any) => m.name) || [];
    results.ollama = { ok: true, detail: models.join(", "), latency_ms: Date.now() - ollamaStart };
  } catch {
    results.ollama = { ok: false, detail: "not running on localhost:11434", latency_ms: Date.now() - ollamaStart };
  }

  // 4. Telegram
  const sb = createClient(supabaseUrl!, supabaseKey!);
  const { data: settings } = await sb.from("user_settings").select("telegram_bot_token, telegram_chat_id").limit(1).maybeSingle();
  if (settings?.telegram_bot_token) {
    const tgStart = Date.now();
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${settings.telegram_bot_token}/getMe`, {}, 10_000);
      const data = await res.json();
      results.telegram = {
        ok: data.ok === true,
        detail: data.ok ? `@${data.result.username}` : data.description,
        latency_ms: Date.now() - tgStart,
      };
    } catch (e: any) {
      results.telegram = { ok: false, detail: e.message, latency_ms: Date.now() - tgStart };
    }
  } else {
    results.telegram = { ok: false, detail: "No bot token configured" };
  }

  // 5. Cron (última execução)
  try {
    const { data: notifs } = await sb.from("notifications_sent").select("sent_at").order("sent_at", { ascending: false }).limit(1);
    const lastNotif = notifs?.[0]?.sent_at || null;
    results.cron = {
      ok: true,
      detail: lastNotif ? `last notification: ${lastNotif}` : "no notifications sent yet",
    };
  } catch {
    results.cron = { ok: false, detail: "cannot query notifications_sent" };
  }

  // Ollama is optional (only runs locally), so exclude from overall status
  const criticalOk = Object.entries(results)
    .filter(([k]) => k !== "ollama")
    .every(([, r]) => r.ok);

  return NextResponse.json({
    ok: criticalOk,
    timestamp: new Date().toISOString(),
    services: results,
  }, { status: criticalOk ? 200 : 503 });
}
