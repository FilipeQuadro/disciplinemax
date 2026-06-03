import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { booksRequestSchema } from "@/lib/schemas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient(): SupabaseClient {
  return createClient(supabaseUrl, serviceRoleKey);
}

// POST /api/books — insert, update, or delete (uses service_role to bypass RLS)
// Requires authenticated user — validates via Authorization header
export async function POST(req: NextRequest) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify user is authenticated (not admin-only, just logged in)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the JWT token
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const parsed = booksRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    const { action, payload, id } = parsed.data;

    // Enforce user_id matches authenticated user
    if (payload?.user_id && payload.user_id !== user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    const sb = getAdminClient();

    if (action === "insert") {
      const insertData = payload ? { ...payload, user_id: user.id } : { user_id: user.id };
      const { data, error } = await sb.from("books").insert(insertData).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    if (action === "update") {
      // Verify ownership
      const { data: book } = await sb.from("books").select("user_id").eq("id", id).maybeSingle();
      if (!book || book.user_id !== user.id) {
        return NextResponse.json({ error: "Not your book" }, { status: 403 });
      }
      const updateData = payload || {};
      const { data, error } = await sb.from("books").update(updateData).eq("id", id).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    if (action === "select") {
      const { data, error } = await sb.from("books").select("*").eq("user_id", user.id).order("created_at");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    if (action === "delete") {
      // Verify ownership
      const { data: book } = await sb.from("books").select("user_id").eq("id", id).maybeSingle();
      if (!book || book.user_id !== user.id) {
        return NextResponse.json({ error: "Not your book" }, { status: 403 });
      }
      const { error } = await sb.from("books").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
