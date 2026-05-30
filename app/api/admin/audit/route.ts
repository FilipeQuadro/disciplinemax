import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const actionFilter = url.searchParams.get("action") || "";
    const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") || "100")));

    let query = sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: logs } = await query;

    return NextResponse.json({ logs: logs || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }
  const { action, target_type, target_id, details, ip_address } = body;

  if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  try {
    const { error } = await sb.from("audit_logs").insert({
      actor_id: actorId,
      action,
      target_type: target_type || null,
      target_id: target_id || null,
      details: details || null,
      ip_address: ip_address || null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
