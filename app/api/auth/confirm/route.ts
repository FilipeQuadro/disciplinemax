import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/admin-auth";
import { authConfirmSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const parsed = authConfirmSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }
  const { userId } = parsed.data;

  // Auth: accept CRON_SECRET (server-to-server) OR a valid user session
  // where the caller is confirming their OWN account (userId matches token subject)
  const isCron = verifyCronSecret(req);
  let isSelfConfirm = false;

  if (!isCron) {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (token) {
      try {
        const sb = createClient(supabaseUrl, anonKey);
        const { data: { user } } = await sb.auth.getUser(token);
        // User can only confirm their own account
        if (user && user.id === userId) {
          isSelfConfirm = true;
        }
      } catch { /* invalid token */ }
    }
  }

  if (!isCron && !isSelfConfirm) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await sb.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
