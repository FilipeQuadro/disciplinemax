import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/admin-auth";
import { dataFetchSchema } from "@/lib/schemas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey);
}

const ALLOWED_TABLES = [
  "books", "bible_goals", "bible_readings", "daily_stats",
  "user_settings", "pomodoro_sessions", "achievements",
  "user_plans", "notification_subscriptions",
];

// Admin-only tables — require admin verification
const ADMIN_ONLY_TABLES = new Set(["admin_users", "blocked_users"]);

// Tables where upsert should conflict on user_id instead of primary key
const UPSERT_USER_SCOPED = new Set(["user_settings", "bible_goals", "user_plans"]);

// Per-user rate limiter — resets on deploy (acceptable for current scale).
// See middleware.ts for rationale on in-memory vs persistent approach.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, lastReset: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Security headers for API responses
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

function apiResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: SECURITY_HEADERS });
}

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return apiResponse({ error: "Not configured" }, 500);
  }

  // Read body as text first, then parse — avoids stream consumption issues
  let rawBody: string;
  try {
    rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return apiResponse({ error: "Empty body" }, 400);
    }
  } catch {
    return apiResponse({ error: "Failed to read request body" }, 400);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return apiResponse({ error: "Invalid JSON" }, 400);
  }

  const parsed = dataFetchSchema.safeParse(json);
  if (!parsed.success) {
    return apiResponse({ error: "Invalid request body", details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  // Auth check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return apiResponse({ error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return apiResponse({ error: "Invalid token" }, 401);

  // Rate limit per user
  if (!checkRateLimit(user.id)) {
    return apiResponse({ error: "Rate limit exceeded" }, 429);
  }

  try {
    const { action, table, filters, payload, id } = body;

    if (!table) {
      return apiResponse({ error: "Table not specified" }, 400);
    }

    // Admin-only tables require admin verification
    if (ADMIN_ONLY_TABLES.has(table)) {
      const adminId = await verifyAdmin(req);
      if (!adminId) {
        return apiResponse({ error: "Admin access required" }, 403);
      }
    } else if (!ALLOWED_TABLES.includes(table)) {
      return apiResponse({ error: "Table not allowed" }, 403);
    }

    const sb = getAdminClient();

    // SELECT
    if (action === "select") {
      let query = sb.from(table).select(filters?.select || "*");
      if (filters?.eq) {
        for (const [key, value] of Object.entries(filters.eq)) {
          query = query.eq(key, value as string);
        }
      }
      if (filters?.gte) {
        for (const [key, value] of Object.entries(filters.gte)) {
          query = query.gte(key, value as string);
        }
      }
      if (filters?.order) query = query.order(filters.order.column, { ascending: filters.order.ascending ?? false });
      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.maybeSingle) {
        const { data, error } = await query.maybeSingle();
        if (error) return apiResponse({ error: error.message }, 400);
        return apiResponse({ data });
      }
      const { data, error } = await query;
      if (error) return apiResponse({ error: error.message }, 400);
      return apiResponse({ data });
    }

    // INSERT
    if (action === "insert") {
      if (!payload) return apiResponse({ error: "Payload required for insert" }, 400);
      if (!payload.user_id) {
        payload.user_id = user.id;
      }
      if (payload.user_id && payload.user_id !== user.id) {
        return apiResponse({ error: "User mismatch" }, 403);
      }
      const { data, error } = await sb.from(table).insert(payload).select();
      if (error) return apiResponse({ error: error.message }, 400);
      return apiResponse({ data });
    }

    // UPDATE
    if (action === "update") {
      if (!payload) return apiResponse({ error: "Payload required for update" }, 400);
      if (!id) return apiResponse({ error: "ID required for update" }, 400);
      const { data: row } = await sb.from(table).select("user_id").eq("id", id).maybeSingle();
      if (!row) {
        return apiResponse({ error: "Not found" }, 404);
      }
      if (row.user_id && row.user_id !== user.id && !ADMIN_ONLY_TABLES.has(table)) {
        return apiResponse({ error: "Not yours" }, 403);
      }
      const { data, error } = await sb.from(table).update(payload).eq("id", id).select();
      if (error) return apiResponse({ error: error.message }, 400);
      return apiResponse({ data });
    }

    // UPSERT
    if (action === "upsert") {
      if (!payload) return apiResponse({ error: "Payload required for upsert" }, 400);
      if (!payload.user_id) {
        payload.user_id = user.id;
      }
      if (payload.user_id && payload.user_id !== user.id) {
        return apiResponse({ error: "User mismatch" }, 403);
      }
      const upsertOpts = UPSERT_USER_SCOPED.has(table) ? { onConflict: "user_id" } : undefined;
      const { data, error } = await sb.from(table).upsert(payload, upsertOpts).select();
      if (error) return apiResponse({ error: error.message }, 400);
      return apiResponse({ data });
    }

    // DELETE
    if (action === "delete") {
      if (!id) return apiResponse({ error: "ID required for delete" }, 400);
      const { data: row } = await sb.from(table).select("user_id").eq("id", id).maybeSingle();
      if (!row) {
        return apiResponse({ error: "Not found" }, 404);
      }
      if (row.user_id && row.user_id !== user.id && !ADMIN_ONLY_TABLES.has(table)) {
        return apiResponse({ error: "Not yours" }, 403);
      }
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return apiResponse({ error: error.message }, 400);
      return apiResponse({ ok: true });
    }

    return apiResponse({ error: "Invalid action" }, 400);
  } catch (e: unknown) {
    return apiResponse({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}
