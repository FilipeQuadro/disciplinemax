import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MetricsService, METRICS } from "@/lib/metrics";
import { logger } from "@/lib/logger";
import { MetricsFlushService } from "@/lib/metrics-flush";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Health check — verifies database and core services.
 * Supports ?detailed for full diagnostics and ?metrics for metrics snapshot.
 * Public (no auth) for Render uptime monitoring.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const detailed = url.searchParams.get("detailed") !== null;
  const withMetrics = url.searchParams.get("metrics") !== null;

  MetricsService.increment(METRICS.HEALTH_CHECKS, { endpoint: "health" });

  // Ensure flush service is running
  MetricsFlushService.start();

  // Basic liveness — always returns 200
  if (!detailed && !withMetrics) {
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      service: "DisciplinaMax",
    });
  }

  // Metrics snapshot
  if (withMetrics) {
    const snapshot = MetricsService.getSnapshot();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      metrics: snapshot,
    });
  }

  // Detailed health — check core services
  const checks: Record<string, { ok: boolean; latency_ms?: number; detail?: string }> = {};

  // Database
  if (supabaseUrl && supabaseKey) {
    const dbStart = Date.now();
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { error } = await sb.from("user_settings").select("user_id").limit(1);
      checks.database = {
        ok: !error,
        latency_ms: Date.now() - dbStart,
        detail: error ? error.message : "connected",
      };
    } catch (e: unknown) {
      checks.database = {
        ok: false,
        latency_ms: Date.now() - dbStart,
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  } else {
    checks.database = { ok: false, detail: "No credentials" };
  }

  // Cron — last notification sent
  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data } = await sb
        .from("notifications_sent")
        .select("sent_at")
        .order("sent_at", { ascending: false })
        .limit(1);
      const lastNotif = data?.[0]?.sent_at ?? null;
      let cronOk = true;
      let detail = "running";
      if (lastNotif) {
        const hoursAgo = (Date.now() - new Date(lastNotif).getTime()) / 3600000;
        if (hoursAgo > 48) {
          cronOk = false;
          detail = `last notification ${Math.round(hoursAgo)}h ago`;
        } else {
          detail = `last notification ${Math.round(hoursAgo)}h ago`;
        }
      } else {
        detail = "no notifications yet";
      }
      checks.cron = { ok: cronOk, detail };
    } catch {
      checks.cron = { ok: false, detail: "cannot query" };
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const totalMs = Date.now() - Number(new Date(url.searchParams.get("_t") || Date.now()));

  return NextResponse.json({
    ok: allOk,
    timestamp: new Date().toISOString(),
    service: "DisciplinaMax",
    checks,
  }, {
    status: allOk ? 200 : 503,
    headers: { "Server-Timing": `health;dur=${totalMs}` },
  });
}
