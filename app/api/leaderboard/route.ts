import { NextResponse } from "next/server";
import { LeaderboardService, type LeaderboardCategory } from "@/lib/services/leaderboard-service";
import { leaderboardQuerySchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = leaderboardQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { category, limit } = parsed.data;
    const service = new LeaderboardService();
    const entries = await service.getLeaderboard(category as LeaderboardCategory, limit);
    return NextResponse.json({ category, entries });
  } catch (e) {
    logger.error("Leaderboard API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
