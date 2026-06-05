import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db-client";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const client = getServiceClient();

    // Get growth metrics from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [referralsRes, sharesRes, friendshipsRes, metricsRes] = await Promise.all([
      client.from("referrals").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      client.from("sharing_events").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
      client.from("friendships").select("*", { count: "exact", head: true }).eq("status", "accepted").gte("created_at", thirtyDaysAgo),
      client.from("growth_metrics").select("metric_name, value, date").gte("date", thirtyDaysAgo).order("date", { ascending: false }),
    ]);

    const recentMetrics = (metricsRes.data as Array<{ metric_name: string; value: number; date: string }>) ?? [];

    // Aggregate metrics by name
    const metricsByName: Record<string, { total: number; dates: string[] }> = {};
    for (const m of recentMetrics) {
      if (!metricsByName[m.metric_name]) metricsByName[m.metric_name] = { total: 0, dates: [] };
      metricsByName[m.metric_name].total += Number(m.value);
      metricsByName[m.metric_name].dates.push(m.date);
    }

    return NextResponse.json({
      period: "30d",
      referrals: { count: referralsRes.count ?? 0 },
      shares: { count: sharesRes.count ?? 0 },
      friendships: { count: friendshipsRes.count ?? 0 },
      metrics: metricsByName,
    });
  } catch (e) {
    logger.error("Admin growth API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
