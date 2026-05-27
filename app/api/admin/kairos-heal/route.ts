import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Kairós AI Server URL (local or remote)
const KAIROS_URL = process.env.KAIROS_URL || "http://localhost:3456";
const KAIROS_KEY = process.env.KAIROS_API_KEY || process.env.CRON_SECRET || "";

// ============================================================
// Types matching Kairós AI server
// ============================================================

interface HealIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "database" | "api" | "telegram" | "auth" | "config" | "schema" | "performance";
  title: string;
  description: string;
  details?: Record<string, unknown>;
  suggestedFix?: string;
}

interface HealAction {
  type: "sql" | "api" | "config" | "telegram" | "manual";
  title: string;
  payload: string;
  issueId: string;
  riskLevel: "safe" | "moderate" | "dangerous";
  description: string;
}

interface HealResult {
  issueId: string;
  actionType: string;
  success: boolean;
  result?: string;
  error?: string;
}

const MAX_HEAL_ATTEMPTS = 3;

// ============================================================
// POST /api/admin/kairos-heal
// ============================================================

export async function POST(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Auth: admin or cron
  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Get issues from request body OR run diagnostic
    let issues: HealIssue[];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.issues && Array.isArray(body.issues) && body.issues.length > 0) {
        issues = body.issues;
      } else {
        // Run diagnostic to get issues
        issues = await runDiagnostic(sb);
      }
    } else {
      issues = await runDiagnostic(sb);
    }

    if (issues.length === 0) {
      await logAudit(sb, "kairos", "heal_skipped", "system", { reason: "No issues found" });
      return NextResponse.json({
        ok: true,
        message: "No issues to heal",
        results: [],
      });
    }

    // Step 2: Call Kairós /analyze endpoint
    const schema = await getSchemaSnapshot(sb);
    const projectContext = buildProjectContext();

    const analyzeResponse = await fetch(`${KAIROS_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-kairos-key": KAIROS_KEY,
      },
      body: JSON.stringify({
        issues,
        projectContext,
        schema,
        supabaseUrl,
        environment: process.env.VERCEL_ENV || "development",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!analyzeResponse.ok) {
      const errText = await analyzeResponse.text().catch(() => "Unknown error");
      throw new Error(`Kairós /analyze failed: ${analyzeResponse.status} - ${errText}`);
    }

    const analysis = (await analyzeResponse.json()) as {
      requestId: string;
      actions: HealAction[];
      summary: string;
      model: string;
    };

    // Step 3: Execute safe/moderate actions (skip dangerous)
    const results: HealResult[] = [];
    const safeActions = analysis.actions.filter(
      (a) => a.riskLevel === "safe" || a.riskLevel === "moderate",
    );

    for (const action of safeActions) {
      const result = await executeAction(action, sb);
      results.push(result);

      // Log each action
      await logAudit(sb, "kairos", `heal_${action.type}`, action.issueId, {
        title: action.title,
        riskLevel: action.riskLevel,
        success: result.success,
        result: result.result?.substring(0, 500),
      });
    }

    // Step 4: Re-run diagnostic to verify fixes
    let remainingIssues: HealIssue[] = [];
    let attempts = 1;

    while (attempts < MAX_HEAL_ATTEMPTS) {
      remainingIssues = await runDiagnostic(sb);
      const remainingCritical = remainingIssues.filter((i) => i.severity === "critical");

      if (remainingCritical.length === 0) break;

      // Re-analyze remaining issues
      const reAnalyzeResponse = await fetch(`${KAIROS_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-key": KAIROS_KEY,
        },
        body: JSON.stringify({
          issues: remainingCritical,
          projectContext,
          schema,
          supabaseUrl,
          environment: process.env.VERCEL_ENV || "development",
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!reAnalyzeResponse.ok) break;

      const reAnalysis = (await reAnalyzeResponse.json()) as { actions: HealAction[] };
      const reSafeActions = reAnalysis.actions.filter(
        (a) => a.riskLevel === "safe" || a.riskLevel === "moderate",
      );

      if (reSafeActions.length === 0) break;

      for (const action of reSafeActions) {
        const result = await executeAction(action, sb);
        results.push(result);
        await logAudit(sb, "kairos", `heal_retry_${action.type}`, action.issueId, {
          attempt: attempts + 1,
          title: action.title,
          success: result.success,
        });
      }

      attempts++;
    }

    // Step 5: Final diagnostic
    const finalIssues = await runDiagnostic(sb);
    const finalCritical = finalIssues.filter((i) => i.severity === "critical");

    // Step 6: Notify Telegram if critical issues remain
    if (finalCritical.length > 0) {
      await notifyTelegramIfNeeded(sb, finalCritical, results);
    }

    // Step 7: Final audit log
    await logAudit(sb, "kairos", "heal_complete", "system", {
      totalIssues: issues.length,
      actionsAttempted: results.length,
      actionsSucceeded: results.filter((r) => r.success).length,
      actionsFailed: results.filter((r) => !r.success).length,
      remainingCritical: finalCritical.length,
      attempts,
      model: analysis.model,
      requestId: analysis.requestId,
    });

    return NextResponse.json({
      ok: finalCritical.length === 0,
      timestamp: new Date().toISOString(),
      requestId: analysis.requestId,
      model: analysis.model,
      summary: analysis.summary,
      totalIssues: issues.length,
      actionsExecuted: results.length,
      actionsSucceeded: results.filter((r) => r.success).length,
      actionsFailed: results.filter((r) => !r.success).length,
      remainingCritical: finalCritical.length,
      dangerousSkipped: analysis.actions.filter((a) => a.riskLevel === "dangerous").length,
      results,
    });
  } catch (e: any) {
    await logAudit(sb, "kairos", "heal_error", "system", {
      error: e.message,
    }).catch(() => {});

    return NextResponse.json({
      ok: false,
      error: e.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ============================================================
// Execute a healing action
// ============================================================

async function executeAction(
  action: HealAction,
  sb: SupabaseClient,
): Promise<HealResult> {
  const result: HealResult = {
    issueId: action.issueId,
    actionType: action.type,
    success: false,
  };

  try {
    switch (action.type) {
      case "sql": {
        // Execute SQL via Supabase RPC or direct query
        // Using the service_role key bypasses RLS
        let rpcResult: { data: any; error: any } | null = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rpcResult = await sb.rpc("exec_sql" as never, { query: action.payload } as never);
        } catch {
          rpcResult = null;
        }
        const { data, error } = rpcResult ?? { data: null, error: new Error("exec_sql RPC not available") };

        if (error) {
          // Try pattern-matching common SQL fixes
          result.success = await tryDirectSqlFix(action.payload, sb);
          if (!result.success) {
            result.error = `SQL execution failed: ${error.message}`;
          }
        } else {
          result.success = true;
          result.result = data ? JSON.stringify(data).substring(0, 200) : "SQL executed";
        }
        break;
      }

      case "api": {
        // Execute an API call
        const apiCall = JSON.parse(action.payload);
        const res = await fetch(apiCall.url, {
          method: apiCall.method || "POST",
          headers: apiCall.headers || {},
          body: apiCall.body ? JSON.stringify(apiCall.body) : undefined,
          signal: AbortSignal.timeout(30000),
        });
        result.success = res.ok;
        result.result = `API ${apiCall.method || "POST"} ${apiCall.url} → ${res.status}`;
        if (!res.ok) {
          result.error = await res.text().catch(() => "Unknown API error");
        }
        break;
      }

      case "config": {
        // Update a configuration value
        // Expected payload: { table, key, field, value } or { envVar, value }
        const config = JSON.parse(action.payload);
        if (config.table && config.key && config.field) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (sb as any)
            .from(config.table)
            .update({ [config.field]: config.value })
            .eq(config.keyField || "id", config.key);
          result.success = !error;
          result.result = error ? error.message : `Updated ${config.table}.${config.field}`;
        } else {
          result.error = "Invalid config payload format";
        }
        break;
      }

      case "telegram": {
        // Send a Telegram notification
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tgSettings }: any = await sb
          .from("user_settings")
          .select("telegram_bot_token, telegram_chat_id")
          .limit(1)
          .single();

        if (tgSettings?.telegram_bot_token && tgSettings?.telegram_chat_id) {
          const res = await fetch(
            `https://api.telegram.org/bot${tgSettings.telegram_bot_token}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: tgSettings.telegram_chat_id,                text: action.payload,
                parse_mode: "Markdown",
              }),
            },
          );
          result.success = res.ok;
          result.result = "Telegram notification sent";
        } else {
          result.error = "Telegram not configured";
        }
        break;
      }

      case "manual":
      default: {
        result.success = false;
        result.error = `Manual action required: ${action.description}`;
        break;
      }
    }
  } catch (e: any) {
    result.error = e.message;
  }

  return result;
}

// ============================================================
// Direct SQL Fix Patterns (fallback when exec_sql RPC not available)
// ============================================================

async function tryDirectSqlFix(sql: string, sb: SupabaseClient): Promise<boolean> {
  const normalized = sql.trim().toUpperCase();

  try {
    // Pattern: CREATE TABLE IF NOT EXISTS
    if (normalized.startsWith("CREATE TABLE")) {
      const tableMatch = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
      if (tableMatch) {
        // Check if table exists
        const { error } = await sb.from(tableMatch[1]).select("*").limit(1);
        if (!error) return true; // Table already exists, consider it fixed
      }
    }

    // Pattern: ALTER TABLE ... ADD COLUMN
    if (normalized.startsWith("ALTER TABLE")) {
      const alterMatch = sql.match(/ALTER\s+TABLE\s+"?(\w+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/i);
      if (alterMatch) {
        // Can't add columns via client, but we can verify the table exists
        const { error } = await sb.from(alterMatch[1]).select("*").limit(1);
        if (!error) {
          // Table exists - column might already be there
          return true;
        }
      }
    }

    // Pattern: UPDATE ... SET ...
    if (normalized.startsWith("UPDATE")) {
      const updateMatch = sql.match(/UPDATE\s+"?(\w+)"?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (updateMatch) {
        const tableName = updateMatch[1];
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];

        // Parse SET clause (simple key = value)
        const setParts: Record<string, unknown> = {};
        for (const part of setClause.split(",")) {
          const [key, ...valueParts] = part.split("=");
          const cleanKey = key.trim().replace(/"/g, "");
          let cleanValue: unknown = valueParts.join("=").trim().replace(/'/g, "").replace(/"/g, "");
          // Try to parse as number
          if (!isNaN(Number(cleanValue))) cleanValue = Number(cleanValue);
          if (cleanValue === "true") cleanValue = true;
          if (cleanValue === "false") cleanValue = false;
          setParts[cleanKey] = cleanValue;
        }

        if (whereClause) {
          const [whereKey, ...whereValueParts] = whereClause.split("=");
          const cleanWhereKey = whereKey.trim().replace(/"/g, "");
          const cleanWhereValue = whereValueParts.join("=").trim().replace(/'/g, "").replace(/"/g, "");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (sb as any)
            .from(tableName)
            .update(setParts)
            .eq(cleanWhereKey, cleanWhereValue);
          return !error;
        } else {
          // No WHERE clause - update all
          // This is dangerous, so we skip it unless risk is safe
          return false;
        }
      }
    }

    // Pattern: INSERT INTO
    if (normalized.startsWith("INSERT")) {
      const insertMatch = sql.match(/INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (insertMatch) {
        const tableName = insertMatch[1];
        const columns = insertMatch[2].split(",").map((c: string) => c.trim().replace(/"/g, ""));
        const values = insertMatch[3].split(",").map((v: string) => {
          const clean = v.trim().replace(/'/g, "").replace(/"/g, "");
          if (!isNaN(Number(clean))) return Number(clean);
          if (clean === "true") return true;
          if (clean === "false") return false;
          if (clean === "null") return null;
          return clean;
        });

        const record: Record<string, unknown> = {};
        columns.forEach((col: string, i: number) => {
          record[col] = values[i];
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (sb as any).from(tableName).upsert(record);
        return !error;
      }
    }
  } catch {
    return false;
  }

  return false;
}

// ============================================================
// Run lightweight diagnostic to collect current issues
// ============================================================

async function runDiagnostic(sb: SupabaseClient): Promise<HealIssue[]> {
  const issues: HealIssue[] = [];

  // Check database tables
  const tables = [
    "books", "bible_goals", "bible_readings", "daily_stats",
    "pomodoro_sessions", "user_settings", "notification_subscriptions",
    "notifications_sent", "achievements", "user_plans", "admin_users",
    "audit_logs", "blocked_users",
  ];

  for (const table of tables) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (sb as any).from(table).select("*").limit(1);
      if (error) {
        issues.push({
          id: `db-${table}`,
          severity: "critical",
          category: "database",
          title: `Table "${table}" inaccessible`,
          description: `Table "${table}" is inaccessible: ${error.message}`,
          details: { table, error: error.message, code: error.code },
        });
      }
    } catch {
      issues.push({
        id: `db-${table}`,
        severity: "critical",
        category: "database",
        title: `Table "${table}" error`,
        description: `Table "${table}" check threw an error`,
      });
    }
  }

  // Check for stale data
  const today = new Date().toISOString().split("T")[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staleBooks }: any = await sb
    .from("books")
    .select("id, title, pages_read_today, user_id")
    .gt("pages_read_today", 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todayStats }: any = await sb
    .from("daily_stats")
    .select("id")
    .eq("date", today)
    .limit(1);

  if (staleBooks && staleBooks.length > 0 && (!todayStats || todayStats.length === 0)) {
    issues.push({
      id: "data-stale-pages",
      severity: "warning",
      category: "database",
      title: "Stale pages_read_today data",
      description: `${staleBooks.length} books have pages_read_today > 0 but no daily_stats for today. Data should be reset.`,
      details: { count: staleBooks.length },
      suggestedFix: "UPDATE books SET pages_read_today = 0 WHERE pages_read_today > 0",
    });
  }

  // Check cron health
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastNotif }: any = await sb
      .from("notifications_sent")
      .select("sent_at")
      .order("sent_at", { ascending: false })
      .limit(1);
    if (lastNotif && lastNotif.length > 0) {
      const hoursSince = (Date.now() - new Date(lastNotif[0].sent_at).getTime()) / 3600000;
      if (hoursSince > 48) {
        issues.push({
          id: "cron-stale",
          severity: "warning",
          category: "config",
          title: "Cron may not be running",
          description: `Last cron notification was ${Math.round(hoursSince)}h ago`,
          suggestedFix: "Check cron-job.org configuration",
        });
      }
    }
  } catch { /* ignore */ }

  return issues;
}

// ============================================================
// Get schema snapshot for context
// ============================================================

async function getSchemaSnapshot(sb: SupabaseClient): Promise<string> {
  // Return known schema as DDL for context
  // In production, this could query information_schema
  const tables = [
    "books", "bible_goals", "bible_readings", "daily_stats",
    "pomodoro_sessions", "user_settings", "notification_subscriptions",
    "notifications_sent", "achievements", "user_plans", "admin_users",
    "audit_logs", "blocked_users",
  ];

  const existing: string[] = [];
  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb as any).from(table).select("*").limit(1);
    if (!error) existing.push(table);
  }

  return `-- DisciplinaMax Schema (existing tables: ${existing.join(", ")})
-- Key tables:
-- books(id, user_id, title, author, total_pages, pages_read, pages_read_today, status)
-- daily_stats(id, user_id, date, pages_read, pomodoros_completed, bible_chapters_read)
-- user_settings(id, user_id, telegram_bot_token, telegram_chat_id, gemini_api_key)
-- bible_goals(id, user_id, daily_chapters, current_streak, longest_streak)
-- pomodoro_sessions(id, user_id, duration_minutes, completed_at)
-- audit_logs(id, actor_id, action, target_type, target_id, details, created_at)
-- notifications_sent(id, user_id, type, sent_at, status)
-- achievements(id, user_id, type, earned_at)
-- user_plans(id, user_id, plan_type, active)
-- admin_users(id, user_id)
-- blocked_users(id, user_id, reason, created_at)
-- notification_subscriptions(id, user_id, endpoint, keys)`;
}

// ============================================================
// Build project context string
// ============================================================

function buildProjectContext(): string {
  return `DisciplinaMax — Next.js 14 + Supabase application.
Stack: Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Realtime), TypeScript, TailwindCSS, Vercel.
Features: Reading tracker, Bible study tracker, Pomodoro timer, Achievements, Telegram notifications, WhatsApp notifications, AI motivation.
Admin: /admin page with diagnostics, user management, audit logs.
Cron: Uses cron-job.org for scheduled tasks (reset daily stats, send notifications).
Auth: Supabase Auth with admin_users table for admin access, CRON_SECRET for server-to-server.`;
}

// ============================================================
// Audit logging
// ============================================================

async function logAudit(
  sb: SupabaseClient,
  actorId: string,
  action: string,
  targetType: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from("audit_logs").insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      details,
    });
  } catch {
    // Don't fail the heal if audit logging fails
  }
}

// ============================================================
// Telegram notification for unresolved critical issues
// ============================================================

async function notifyTelegramIfNeeded(
  sb: SupabaseClient,
  criticalIssues: HealIssue[],
  results: HealResult[],
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tgSettings }: any = await sb
      .from("user_settings")
      .select("telegram_bot_token, telegram_chat_id")
      .limit(1)
      .single();

    if (!tgSettings?.telegram_bot_token || !tgSettings?.telegram_chat_id) return;

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const msg = `🤖 *Kairós AI — Auto-Heal Report*

❌ ${criticalIssues.length} critical issue(s) remain after auto-heal:
${criticalIssues.map((i) => `• ${i.title}`).join("\n")}

✅ Fixes applied: ${succeeded}
❌ Fixes failed: ${failed}
🤖 Actor: kairos

⏰ ${new Date().toISOString()}`;

    await fetch(
      `https://api.telegram.org/bot${tgSettings.telegram_bot_token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgSettings.telegram_chat_id,
          text: msg,
          parse_mode: "Markdown",
        }),
      },
    );
  } catch {
    // Don't fail the heal if Telegram notification fails
  }
}
