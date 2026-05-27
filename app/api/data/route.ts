import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey);
}

// Tables that users can read their own data from
const ALLOWED_TABLES = [
  "books", "bible_goals", "bible_readings", "daily_stats",
  "user_settings", "pomodoro_sessions", "achievements",
  "user_plans", "admin_users", "blocked_users", "notification_subscriptions",
];

// POST /api/data — generic data access using service_role (bypasses RLS)
export async function POST(req: Request) {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify user is authenticated
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, table, filters, data: payload, id } = body;

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: "Table not allowed" }, { status: 403 });
    }

    const sb = getAdminClient();

    // SELECT
    if (action === "select") {
      let query = sb.from(table).select(filters?.select || "*");
      // Apply user_id filter by default for user-scoped tables
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
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ data });
      }
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // INSERT
    if (action === "insert") {
      // Enforce user_id for user-scoped tables
      if (payload && !payload.user_id && table !== "admin_users") {
        payload.user_id = user.id;
      }
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return NextResponse.json({ error: "User mismatch" }, { status: 403 });
      }
      const { data, error } = await sb.from(table).insert(payload).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // UPDATE
    if (action === "update") {
      // Verify ownership for user-scoped tables
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return NextResponse.json({ error: "Not yours" }, { status: 403 });
        }
      }
      const { data, error } = await sb.from(table).update(payload).eq("id", id).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // UPSERT
    if (action === "upsert") {
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return NextResponse.json({ error: "User mismatch" }, { status: 403 });
      }
      const { data, error } = await sb.from(table).upsert(payload).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // DELETE
    if (action === "delete") {
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return NextResponse.json({ error: "Not yours" }, { status: 403 });
        }
      }
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
