import { NextResponse } from "next/server";
import { FriendshipService } from "@/lib/services/friendship-service";
import { friendRequestSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = friendRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, action, targetUserId } = parsed.data;
    const service = new FriendshipService();

    switch (action) {
      case "send": {
        if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        const result = await service.sendRequest(userId, targetUserId);
        if (!result) return NextResponse.json({ error: "Request already exists or invalid" }, { status: 409 });
        return NextResponse.json({ friendship: result });
      }
      case "accept": {
        if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        const result = await service.acceptRequest(targetUserId, userId);
        if (!result) return NextResponse.json({ error: "No pending request found" }, { status: 404 });
        return NextResponse.json({ friendship: result });
      }
      case "remove": {
        if (!targetUserId) return NextResponse.json({ error: "Missing targetUserId" }, { status: 400 });
        const ok = await service.removeFriend(userId, targetUserId);
        return NextResponse.json({ success: ok });
      }
      case "list": {
        const friends = await service.getFriends(userId);
        return NextResponse.json({ friends });
      }
      case "list_pending": {
        const pending = await service.getPendingRequests(userId);
        return NextResponse.json({ pending });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("Friends API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
