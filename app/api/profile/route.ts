import { NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/profile-service";
import { profileUpdateSchema } from "@/lib/schemas";
import { logger } from "@/lib/logger";
import { getAuthUserId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const service = new ProfileService();
    const profile = await service.getProfile(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Allow reading any public profile, but private profiles only for the owner
    if (!profile.is_public && userId !== callerId) {
      return NextResponse.json({ error: "Profile is private" }, { status: 403 });
    }

    return NextResponse.json({ profile });
  } catch (e) {
    logger.error("Profile GET error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { userId, username, displayName, bio, isPublic } = parsed.data;

    // Ownership check: can only update your own profile
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only update your own profile" }, { status: 403 });
    }

    const service = new ProfileService();
    const profile = await service.upsertProfile(userId, {
      username,
      display_name: displayName,
      bio,
      is_public: isPublic,
    });

    if (!profile) {
      return NextResponse.json({ error: "Failed to update profile — username may be taken" }, { status: 409 });
    }

    return NextResponse.json({ profile });
  } catch (e) {
    logger.error("Profile PUT error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Authenticate the caller
    const callerId = await getAuthUserId(req);
    if (!callerId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, displayName } = body as { userId: string; displayName?: string };
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Ownership check: can only create your own profile
    if (userId !== callerId) {
      return NextResponse.json({ error: "Can only create your own profile" }, { status: 403 });
    }

    const service = new ProfileService();
    const profile = await service.ensureProfile(userId, displayName);
    if (!profile) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (e) {
    logger.error("Profile POST error", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
