import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NEVER process API routes — return immediately without touching the response
  // This is critical: NextResponse.next() on API routes can consume the POST body
  // in Next.js 14, causing "Empty or invalid json" errors in production
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip for static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Apply security headers to page responses only
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  return response;
}

// Match ALL routes — the guard inside middleware() handles API exclusion
export const config = {
  matcher: ["/(.*)"],
};
