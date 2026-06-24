import { NextResponse } from "next/server";
import { verifyAdminOrCron } from "@/lib/admin-auth";
import { RateLimitService } from "@/lib/rate-limit";
import { initRequestId, logger } from "@/lib/logger";
import { ProductAnalyticsService } from "@/lib/repositories/product-analytics-repository";

export async function GET(req: Request) {
  initRequestId(req);

  const rateLimited = RateLimitService.checkRequest(req, "admin");
  if (rateLimited) return rateLimited;

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const analytics = new ProductAnalyticsService();

    // Check if we want fresh computation or cached
    const url = new URL(req.url);
    const fresh = url.searchParams.get("fresh") === "true";

    const snapshot = fresh
      ? await analytics.computeAndSave()
      : (await analytics.getLatestSnapshot()) ?? await analytics.computeAndSave();

    return NextResponse.json({ ok: true, analytics: snapshot });
  } catch (e: unknown) {
    logger.error("Analytics endpoint failed", { error: String(e) });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
