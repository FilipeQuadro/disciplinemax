import { NextResponse } from "next/server";
import { CommunityEventService } from "@/lib/services/community-event-service";
import { communityEventRequestSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const service = new CommunityEventService();
    const challenges = await service.getActiveChallenges();

    const enriched = await Promise.all(
      challenges.map(async (c) => {
        const progress = await service.getChallengeProgress(c.id);
        return { ...c, ...progress };
      }),
    );

    return NextResponse.json({ challenges: enriched });
  } catch (e) {
    logger.error("Community events GET error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = communityEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, action, challengeId, contribution } = parsed.data;
    const service = new CommunityEventService();

    switch (action) {
      case "list": {
        const challenges = await service.getActiveChallenges();
        return NextResponse.json({ challenges });
      }
      case "contribute": {
        if (!challengeId || contribution === undefined) {
          return NextResponse.json({ error: "Missing challengeId or contribution" }, { status: 400 });
        }
        const ok = await service.contribute(challengeId, userId, contribution);
        return NextResponse.json({ success: ok });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("Community events POST error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
