import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RateLimitService } from "@/lib/rate-limit";
import { guestAuthResponseSchema } from "@/lib/schemas";
import { initRequestId } from "@/lib/logger";

export async function POST(req: NextRequest) {
  initRequestId(req);

  const rateLimited = RateLimitService.checkRequest(req, "auth");
  if (rateLimited) return rateLimited;

  const email = process.env.GUEST_EMAIL;
  const password = process.env.GUEST_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ error: "Guest mode not configured" }, { status: 503 });
  }

  const response = guestAuthResponseSchema.safeParse({ email, password });
  if (!response.success) {
    return NextResponse.json({ error: "Guest credentials misconfigured" }, { status: 503 });
  }

  return NextResponse.json({ email, password });
}
