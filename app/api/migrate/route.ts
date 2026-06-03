import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * GET /api/migrate — Run pending database migrations.
 * Uses PostgREST probe to detect missing columns, then reports SQL needed.
 * Requires CRON_SECRET or admin auth.
 */
export async function GET(req: Request) {
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const results: string[] = [];

  // Migration 1: greenapi_instance_id column
  const col1 = await checkAndAddColumn(sb, "user_settings", "greenapi_instance_id", "TEXT");
  results.push(col1);

  // Migration 2: greenapi_token column
  const col2 = await checkAndAddColumn(sb, "user_settings", "greenapi_token", "TEXT");
  results.push(col2);

  return NextResponse.json({ ok: true, migrations: results });
}

/**
 * Check if a column exists in a table by probing PostgREST.
 * Returns a human-readable status message.
 */
async function checkAndAddColumn(
  sb: { from: (table: string) => { select: (col: string) => { limit: (n: number) => PromiseLike<{ error: unknown }> } } },
  table: string,
  column: string,
  type: string
): Promise<string> {
  // Probe: try to select the column
  const { error } = await sb.from(table).select(column).limit(1);

  if (!error) {
    return `${table}.${column}: already exists`;
  }

  const errMsg = (error as { message?: string }).message || String(error);
  if (!errMsg?.includes("does not exist")) {
    return `${table}.${column}: probe error — ${errMsg}`;
  }

  // Column doesn't exist — we can't add it programmatically (no exec_sql RPC).
  // Return the SQL the user needs to run manually.
  return `${table}.${column}: ⚠️ needs manual SQL — ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type};`;
}
