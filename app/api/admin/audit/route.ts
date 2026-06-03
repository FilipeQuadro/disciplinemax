import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminOrCron } from "@/lib/admin-auth";
import { auditLogSchema, auditQuerySchema } from "@/lib/schemas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const parsed = auditQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params", details: parsed.error.flatten() }, { status: 400 });
    }
    const { action: actionFilter, limit } = parsed.data;

    let query = sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);

    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: logs } = await query;

    return NextResponse.json({ logs: logs || [] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!supabaseUrl || !supabaseKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const { isAdmin, actorId } = await verifyAdminOrCron(req);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = createClient(supabaseUrl, supabaseKey);
  const parsed = auditLogSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { action, target_type, target_id, details, ip_address } = parsed.data;

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
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
