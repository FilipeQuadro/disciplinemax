import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MetricsService, METRICS } from "@/lib/metrics";

/**
 * Readiness check — verifies all dependencies are available.
 * Used by orchestrators to determine if the app should receive traffic.
 */
export async function GET() {
  MetricsService.increment(METRICS.HEALTH_CHECKS, { endpoint: "ready" });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      ok: false,
      detail: "Supabase credentials not configured",
    }, { status: 503 });
  }

  try {
    const sb = createClient(supabaseUrl, supabaseKey);
    const { error } = await sb.from("user_settings").select("user_id").limit(1);
    if (error) {
      return NextResponse.json({
        ok: false,
        detail: `Database error: ${error.message}`,
      }, { status: 503 });
    }
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      detail: `Database unreachable: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 503 });
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
