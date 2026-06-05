import { NextResponse } from "next/server";
import { LeaderboardService, type LeaderboardCategory } from "@/lib/services/leaderboard-service";
import { leaderboardQuerySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { ApplicationCacheService } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = leaderboardQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { category, limit } = parsed.data;
    const cacheKey = `${category}:${limit}`;

    const entries = await ApplicationCacheService.getOrSet(
      cacheKey,
      async () => {
        const service = new LeaderboardService();
        return service.getLeaderboard(category as LeaderboardCategory, limit);
      },
      "leaderboard",
    );

    return NextResponse.json({ category, entries });
  } catch (e) {
    logger.error("Leaderboard API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
