import { NextResponse } from "next/server";
import { FeedService } from "@/lib/services/feed-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  userId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(), // ISO timestamp for cursor-based pagination
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, limit, cursor } = parsed.data;
    const service = new FeedService();
    const events = await service.getFeed(userId, limit, cursor);
    return NextResponse.json({
      events,
      nextCursor: events.length === limit && events.length > 0
        ? events[events.length - 1].created_at
        : undefined,
    });
  } catch (e) {
    logger.error("Feed API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
