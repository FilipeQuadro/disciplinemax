import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const results: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "achievements", "user_plans", "admin_users"];
    const tableOk: Record<string, boolean> = {};
    for (const t of tables) {
      try { const { error } = await sb.from(t).select("id").limit(1); tableOk[t] = !error; } catch { tableOk[t] = false; }
    }
    results.supabase = { ok: Object.values(tableOk).every(Boolean), detail: JSON.stringify(tableOk) };
  } catch (e: any) { results.supabase = { ok: false, detail: e.message }; }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }], generationConfig: { maxOutputTokens: 5 } }),
        signal: AbortSignal.timeout(10000),
      });
      const d = await res.json();
      results.gemini = { ok: !!d.candidates?.[0]?.content?.parts?.[0]?.text, detail: d.candidates ? "responding" : (d.error?.message || "null") };
    } else { results.gemini = { ok: false, detail: "No key in env" }; }
  } catch (e: any) { results.gemini = { ok: false, detail: e.message }; }

  try {
    const { data: settings } = await sb.from("user_settings").select("telegram_bot_token").limit(1).single();
    if (settings?.telegram_bot_token) {
      const r = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/getMe`, { signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      results.telegram = { ok: d.ok === true, detail: d.ok ? `@${d.result.username}` : d.description };
    } else { results.telegram = { ok: false, detail: "No bot token" }; }
  } catch (e: any) { results.telegram = { ok: false, detail: e.message }; }

  return NextResponse.json({ services: results, timestamp: new Date().toISOString() });
}
