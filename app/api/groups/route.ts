import { NextResponse } from "next/server";
import { GroupService } from "@/lib/services/group-service";
import { groupRequestSchema } from "@/lib/schemas";
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
    const parsed = groupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, action, groupId } = parsed.data;

    // Ownership check: caller can only act as themselves
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only perform actions as yourself" }, { status: 403 });
    }

    const service = new GroupService();

    switch (action) {
      case "list": {
        const groups = await service.listGroups();
        const userGroups = await service.getUserGroups(userId);
        const userGroupIds = new Set(userGroups.map((g) => g.id));
        return NextResponse.json({
          groups: groups.map((g) => ({ ...g, isMember: userGroupIds.has(g.id) })),
          userGroups,
        });
      }
      case "join": {
        if (!groupId) return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
        const ok = await service.joinGroup(groupId, userId);
        return NextResponse.json({ success: ok });
      }
      case "leave": {
        if (!groupId) return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
        const ok = await service.leaveGroup(groupId, userId);
        return NextResponse.json({ success: ok });
      }
      case "ranking": {
        if (!groupId) return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
        const ranking = await service.getGroupRanking(groupId);
        return NextResponse.json({ ranking });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    logger.error("Groups API error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
