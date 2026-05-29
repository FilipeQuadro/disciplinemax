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
 * Check if a column exists in a table. If not, add it.
 * Uses PostgREST to probe — if select(column) returns 400 with "does not exist",
 * we know the column is missing and need to add it via SQL.
 */
async function checkAndAddColumn(
  sb: any,
  table: string,
  column: string,
  type: string
): Promise<string> {
  // Probe: try to select the column
  const { error } = await sb.from(table).select(column).limit(1);

  if (!error) {
    return `${table}.${column}: already exists`;
  }

  if (!error.message?.includes("does not exist")) {
    return `${table}.${column}: probe error — ${error.message}`;
  }

  // Column doesn't exist — try to add it via Supabase SQL API
  // The Supabase JS client doesn't support DDL, so we use the REST SQL endpoint
  try {
    const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type};`,
      }),
    });

    if (sqlResponse.ok) {
      return `${table}.${column}: ✅ added successfully`;
    }

    // RPC might not exist — try the Management API alternative
    const sqlError = await sqlResponse.text();
    return `${table}.${column}: ⚠️ needs manual SQL — ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}; (RPC error: ${sqlError})`;
  } catch (e: any) {
    return `${table}.${column}: ⚠️ needs manual SQL — ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${type}; (${e.message})`;
  }
}
