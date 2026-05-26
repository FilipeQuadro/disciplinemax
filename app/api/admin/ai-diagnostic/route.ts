import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callOllama } from "@/lib/ai";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface DiagnosticIssue {
  severity: "critical" | "warning" | "info";
  area: string;
  message: string;
  autoFixed?: boolean;
  fix?: string;
}

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const issues: DiagnosticIssue[] = [];
  const fixes: string[] = [];

  try {
    // 1. Check database tables health
    const tables = ["books", "bible_goals", "bible_readings", "daily_stats", "pomodoro_sessions", "user_settings", "notification_subscriptions", "notifications_sent", "achievements", "user_plans", "admin_users", "audit_logs", "blocked_users"];
    const tableStatus: Record<string, boolean> = {};

    for (const table of tables) {
      try {
        const { error } = await sb.from(table).select("id").limit(1);
        tableStatus[table] = !error;
        if (error) {
          issues.push({
            severity: "critical",
            area: "database",
            message: `Table "${table}" is inaccessible: ${error.message}`,
          });
        }
      } catch {
        tableStatus[table] = false;
        issues.push({
          severity: "critical",
          area: "database",
          message: `Table "${table}" check threw an error`,
        });
      }
    }

    // 2. Check for stale data — pages_read_today not reset
    const today = new Date().toISOString().split("T")[0];
    const { data: staleBooks } = await sb.from("books").select("id, title, pages_read_today, user_id").gt("pages_read_today", 0);
    const { data: todayStats } = await sb.from("daily_stats").select("id").eq("date", today).limit(1);

    if (staleBooks && staleBooks.length > 0 && (!todayStats || todayStats.length === 0)) {
      // Auto-fix: Reset stale pages_read_today
      const { error: resetError } = await sb.from("books").update({ pages_read_today: 0 }).gt("pages_read_today", 0);
      if (!resetError) {
        fixes.push(`Auto-fixed: Reset pages_read_today for ${staleBooks.length} books (no daily_stats for today)`);
        issues.push({
          severity: "warning",
          area: "data_integrity",
          message: `Reset ${staleBooks.length} books with stale pages_read_today`,
          autoFixed: true,
          fix: "Reset all pages_read_today to 0",
        });
      }
    }

    // 3. Check for orphaned data (user_settings without matching auth user)
    const { data: settingsData } = await sb.from("user_settings").select("user_id").limit(200);
    if (settingsData) {
      // Check for blocked users
      const { data: blockedData } = await sb.from("blocked_users").select("user_id");
      const blockedIds = new Set((blockedData || []).map((b: any) => b.user_id));

      for (const s of settingsData) {
        if (blockedIds.has(s.user_id)) {
          issues.push({
            severity: "info",
            area: "blocked_users",
            message: `User ${s.user_id.substring(0, 8)}... is blocked`,
          });
        }
      }
    }

    // 4. Check Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      issues.push({ severity: "warning", area: "ai", message: "GEMINI_API_KEY not set — AI features will use static fallbacks" });
    } else {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "ping" }] }],
              generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
            }),
            signal: AbortSignal.timeout(10000),
          }
        );
        const data = await res.json();
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          issues.push({ severity: "warning", area: "ai", message: `Gemini API returned unexpected response: ${data.error?.message || "null"}` });
        }
      } catch (e: any) {
        issues.push({ severity: "warning", area: "ai", message: `Gemini API unreachable: ${e.message}` });
      }
    }

    // 5. Check Telegram bot
    const { data: tgSettings } = await sb.from("user_settings").select("telegram_bot_token, telegram_chat_id").limit(1).single();
    if (tgSettings?.telegram_bot_token) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${tgSettings.telegram_bot_token}/getMe`, { signal: AbortSignal.timeout(10000) });
        const data = await res.json();
        if (!data.ok) {
          issues.push({ severity: "warning", area: "telegram", message: `Telegram bot error: ${data.description}` });
        }
      } catch (e: any) {
        issues.push({ severity: "warning", area: "telegram", message: `Telegram API unreachable: ${e.message}` });
      }
    } else {
      issues.push({ severity: "info", area: "telegram", message: "No Telegram bot configured" });
    }

    // 6. Check cron execution
    try {
      const { data: lastNotif } = await sb.from("notifications_sent").select("sent_at").order("sent_at", { ascending: false }).limit(1);
      if (lastNotif && lastNotif.length > 0) {
        const hoursSince = (Date.now() - new Date(lastNotif[0].sent_at).getTime()) / 3600000;
        if (hoursSince > 48) {
          issues.push({
            severity: "warning",
            area: "cron",
            message: `Last cron notification was ${Math.round(hoursSince)}h ago — cron may not be running`,
          });
        }
      }
    } catch { /* notifications_sent might not have data */ }

    // 7. Use AI to analyze issues if any exist
    let aiAnalysis: string | null = null;
    if (issues.length > 0) {
      const issueSummary = issues.map((i) => `[${i.severity}] ${i.area}: ${i.message}${i.autoFixed ? " (AUTO-FIXED)" : ""}`).join("\n");
      const prompt = `Você é um administrador de sistema IA. Analise estes problemas do DisciplinaMax e sugira soluções em português (máx 3 frases):

${issueSummary}

Problemas já corrigidos automaticamente: ${fixes.length > 0 ? fixes.join("; ") : "nenhum"}`;

      try {
        // Try Gemini first
        if (apiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
              }),
              signal: AbortSignal.timeout(15000),
            }
          );
          const data = await res.json();
          aiAnalysis = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }

        // Fallback to Ollama
        if (!aiAnalysis) {
          aiAnalysis = await callOllama(prompt);
        }
      } catch { /* AI analysis is optional */ }
    }

    // 8. Log this diagnostic run
    await sb.from("audit_logs").insert({
      actor_id: "system",
      action: "auto_diagnostic",
      target_type: "system",
      details: {
        issues_found: issues.length,
        auto_fixed: fixes.length,
        critical: issues.filter((i) => i.severity === "critical").length,
        warnings: issues.filter((i) => i.severity === "warning").length,
      },
    }).then(() => {}, () => {});

    // 9. Send Telegram alert for critical issues
    const criticalIssues = issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0 && tgSettings?.telegram_bot_token && tgSettings?.telegram_chat_id) {
      try {
        const alertMsg = `🚨 *DisciplinaMax — Diagnóstico Automático*\n\n❌ ${criticalIssues.length} problema(s) crítico(s):\n${criticalIssues.map((i) => `• ${i.area}: ${i.message}`).join("\n")}\n\n${fixes.length > 0 ? `✅ Auto-corrigido: ${fixes.join("; ")}` : ""}\n\n⏰ ${new Date().toISOString()}`;
        await fetch(`https://api.telegram.org/bot${tgSettings.telegram_bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgSettings.telegram_chat_id, text: alertMsg, parse_mode: "Markdown" }),
        });
      } catch { /* Don't fail diagnostic if Telegram fails */ }
    }

    const allOk = issues.filter((i) => i.severity === "critical").length === 0;

    return NextResponse.json({
      ok: allOk,
      timestamp: new Date().toISOString(),
      issues,
      fixes,
      aiAnalysis,
      tableStatus,
    }, { status: allOk ? 200 : 503 });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      timestamp: new Date().toISOString(),
      issues: [{ severity: "critical", area: "system", message: e.message }],
      fixes: [],
    }, { status: 500 });
  }
}
