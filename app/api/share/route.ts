import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/db-client";
import { logger } from "@/lib/logger";
import { getAuthUserId } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json() as { userId?: string; shareType?: string; data?: Record<string, unknown> };
    const { userId, shareType, data } = body;

    if (!userId || !shareType) {
      return NextResponse.json({ error: "Missing userId or shareType" }, { status: 400 });
    }

    // Ownership check: caller can only share as themselves
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only share as yourself" }, { status: 403 });
    }

    // Persist sharing event (best effort)
    try {
      const client = getServiceClient();
      await client.from("sharing_events").insert({
        user_id: userId,
        share_type: shareType,
        data: data ?? {},
      });
    } catch { /* best effort */ }

    // Increment growth metric
    try {
      const client = getServiceClient();
      await client.from("growth_metrics").insert({
        metric_name: "shares_total",
        value: 1,
      });
    } catch { /* best effort */ }

    return NextResponse.json({ success: true });
  } catch (e) {
    logger.error("Share API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
