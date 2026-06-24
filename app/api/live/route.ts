import { NextResponse } from "next/server";
import { MetricsService, METRICS } from "@/lib/metrics";

/**
 * Liveness check — verifies the process is alive and responding.
 * If this fails, the orchestrator should restart the process.
 */
export async function GET() {
  MetricsService.increment(METRICS.HEALTH_CHECKS, { endpoint: "live" });

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - MetricsService.getSnapshot().uptime_ms,
  });
}
