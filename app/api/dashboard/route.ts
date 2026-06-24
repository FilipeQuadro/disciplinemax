import { NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard-service";
import { logger } from "@/lib/logger";
import { getAuthUserId } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  userId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      userId: searchParams.get("userId"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing or invalid userId" },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    // Ownership check: caller can only access their own dashboard
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only access your own dashboard" }, { status: 403 });
    }

    const service = new DashboardService();
    const data = await service.getDashboardData(userId);

    if (!data) {
      return NextResponse.json(
        { error: "Dashboard data unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    logger.error("Dashboard API error", { error: String(e) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
