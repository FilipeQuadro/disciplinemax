import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// SECURITY: This middleware MUST NOT run for /api/ routes.
// Next.js 14 has a bug where NextResponse.next() in middleware
// consumes the POST body stream, causing "Empty or invalid json".
// The matcher below ensures this function NEVER executes for API routes.
export function middleware(request: NextRequest) {
  // Apply security headers to page responses only
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}

// Only match page routes — explicitly exclude ALL /api/ paths
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
