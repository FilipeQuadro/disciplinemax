import { vi } from "vitest";

// Mock environment variables for all tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.CRON_SECRET = "test-cron-secret";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private";
process.env.NEXT_PUBLIC_BASE_URL = "https://disciplinemax.onrender.com";

// Mock NextResponse.json globally (API routes use it)
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string>) },
        status: init?.status ?? 200,
      }),
  },
  NextRequest: class NextRequest extends Request {},
}));
