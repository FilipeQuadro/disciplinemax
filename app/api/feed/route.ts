import { NextResponse } from "next/server";
import { FeedService } from "@/lib/services/feed-service";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") ?? "30", 10);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const service = new FeedService();
    const events = await service.getFeed(userId, Math.min(limit, 100));
    return NextResponse.json({ events });
  } catch (e) {
    logger.error("Feed API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
