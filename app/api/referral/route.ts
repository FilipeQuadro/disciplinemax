import { NextResponse } from "next/server";
import { ReferralService } from "@/lib/services/referral-service";
import { referralRequestSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { getAuthUserId } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = referralRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, action, code } = parsed.data;

    // Ownership check: caller can only access their own referral info
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only access your own referrals" }, { status: 403 });
    }

    const service = new ReferralService();

    switch (action) {
      case "get_code": {
        const referralCode = await service.getReferralCode(userId);
        const referralCount = await service.getReferralCount(userId);
        return NextResponse.json({ referralCode, referralCount });
      }
      case "track": {
        if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
        const referral = await service.trackReferral(userId, code);
        if (!referral) return NextResponse.json({ error: "Invalid or duplicate referral" }, { status: 400 });
        return NextResponse.json({ referral });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("Referral API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
