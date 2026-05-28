import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey);
}

const ALLOWED_TABLES = [
  "books", "bible_goals", "bible_readings", "daily_stats",
  "user_settings", "pomodoro_sessions", "achievements",
  "user_plans", "admin_users", "blocked_users", "notification_subscriptions",
];

const UPSERT_USER_SCOPED = new Set(["user_settings", "bible_goals", "user_plans"]);

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

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

// GET /api/data — health check
export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Not configured" }, 500);
  }

  // Parse body — try req.json() first, fall back to req.text() + JSON.parse()
  let body: any;
  try {
    body = await req.json();
  } catch {
    try {
      const raw = await req.text();
      if (!raw || !raw.trim()) {
        return json({ error: "Empty body" }, 400);
      }
      body = JSON.parse(raw);
    } catch (e: any) {
      return json({ error: `Invalid JSON: ${e.message}` }, 400);
    }
  }

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid body" }, 400);
  }

  // Auth
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Invalid token" }, 401);

  if (!checkRateLimit(user.id)) {
    return json({ error: "Rate limit exceeded" }, 429);
  }

  try {
    const { action, table, filters, data: payload, id } = body;

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return json({ error: "Table not allowed" }, 403);
    }

    const sb = getAdminClient();

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
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "insert") {
      if (payload && !payload.user_id && table !== "admin_users") {
        payload.user_id = user.id;
      }
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return json({ error: "User mismatch" }, 403);
      }
      const { data, error } = await sb.from(table).insert(payload).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "update") {
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return json({ error: "Not yours" }, 403);
        }
      }
      const { data, error } = await sb.from(table).update(payload).eq("id", id).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "upsert") {
      if (!payload.user_id && table !== "admin_users") {
        payload.user_id = user.id;
      }
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return json({ error: "User mismatch" }, 403);
      }
      const upsertOpts = UPSERT_USER_SCOPED.has(table) ? { onConflict: "user_id" } : undefined;
      const { data, error } = await sb.from(table).upsert(payload, upsertOpts).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === "delete") {
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return json({ error: "Not yours" }, 403);
        }
      }
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}
