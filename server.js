const { createServer } = require("http");
const { parse } = require("url");

const PORT = process.env.PORT || 3000;

// ── Read raw body from Node.js IncomingMessage ────────────────────
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// ── JSON response helper ──────────────────────────────────────────
function jsonRes(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

// ── /api/data handler (bypasses Next.js entirely) ─────────────────
async function handleApiData(req, res) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonRes(res, { error: "Not configured" }, 500);
  }

  // Read body directly from Node.js
  let body;
  try {
    const raw = await readRawBody(req);
    if (!raw || !raw.trim()) {
      return jsonRes(res, { error: "Empty body" }, 400);
    }
    body = JSON.parse(raw);
  } catch (e) {
    return jsonRes(res, { error: `Invalid JSON: ${e.message}` }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonRes(res, { error: "Invalid body" }, 400);
  }

  // Auth — verify JWT
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return jsonRes(res, { error: "Unauthorized" }, 401);

  let user;
  try {
    const { createClient } = require("@supabase/supabase-js");
    const authClient = createClient(supabaseUrl, anonKey);
    const result = await authClient.auth.getUser(token);
    user = result.data.user;
    if (!user || result.error) return jsonRes(res, { error: "Invalid token" }, 401);
  } catch {
    return jsonRes(res, { error: "Auth error" }, 401);
  }

  // Rate limit (in-memory, per process)
  if (!globalThis.__rateLimitMap) globalThis.__rateLimitMap = new Map();
  const rlMap = globalThis.__rateLimitMap;
  const now = Date.now();
  const rlEntry = rlMap.get(user.id);
  if (!rlEntry || now - rlEntry.lastReset > 60000) {
    rlMap.set(user.id, { count: 1, lastReset: now });
  } else if (rlEntry.count >= 60) {
    return jsonRes(res, { error: "Rate limit exceeded" }, 429);
  } else {
    rlEntry.count++;
  }

  try {
    const { createClient } = require("@supabase/supabase-js");
    const { action, table, filters, data: payload, id } = body;

    const ALLOWED_TABLES = [
      "books", "bible_goals", "bible_readings", "daily_stats",
      "user_settings", "pomodoro_sessions", "achievements",
      "user_plans", "admin_users", "blocked_users", "notification_subscriptions",
    ];

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return jsonRes(res, { error: "Table not allowed" }, 403);
    }

    const UPSERT_USER_SCOPED = new Set(["user_settings", "bible_goals", "user_plans"]);
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // SELECT
    if (action === "select") {
      let query = sb.from(table).select(filters?.select || "*");
      if (filters?.eq) {
        for (const [key, value] of Object.entries(filters.eq)) {
          query = query.eq(key, value);
        }
      }
      if (filters?.gte) {
        for (const [key, value] of Object.entries(filters.gte)) {
          query = query.gte(key, value);
        }
      }
      if (filters?.order) query = query.order(filters.order.column, { ascending: filters.order.ascending ?? false });
      if (filters?.limit) query = query.limit(filters.limit);
      if (filters?.maybeSingle) {
        const { data, error } = await query.maybeSingle();
        if (error) return jsonRes(res, { error: error.message }, 400);
        return jsonRes(res, { data });
      }
      const { data, error } = await query;
      if (error) return jsonRes(res, { error: error.message }, 400);
      return jsonRes(res, { data });
    }

    // INSERT
    if (action === "insert") {
      if (payload && !payload.user_id && table !== "admin_users") {
        payload.user_id = user.id;
      }
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return jsonRes(res, { error: "User mismatch" }, 403);
      }
      const { data, error } = await sb.from(table).insert(payload).select();
      if (error) return jsonRes(res, { error: error.message }, 400);
      return jsonRes(res, { data });
    }

    // UPDATE
    if (action === "update") {
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return jsonRes(res, { error: "Not yours" }, 403);
        }
      }
      const { data, error } = await sb.from(table).update(payload).eq("id", id).select();
      if (error) return jsonRes(res, { error: error.message }, 400);
      return jsonRes(res, { data });
    }

    // UPSERT
    if (action === "upsert") {
      if (!payload.user_id && table !== "admin_users") {
        payload.user_id = user.id;
      }
      if (payload?.user_id && payload.user_id !== user.id && table !== "admin_users") {
        return jsonRes(res, { error: "User mismatch" }, 403);
      }
      const upsertOpts = UPSERT_USER_SCOPED.has(table) ? { onConflict: "user_id" } : undefined;
      const { data, error } = await sb.from(table).upsert(payload, upsertOpts).select();
      if (error) return jsonRes(res, { error: error.message }, 400);
      return jsonRes(res, { data });
    }

    // DELETE
    if (action === "delete") {
      if (table !== "admin_users") {
        const { data: row } = await sb.from(table).select("user_id").eq("id", id).single();
        if (row && row.user_id !== user.id) {
          return jsonRes(res, { error: "Not yours" }, 403);
        }
      }
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) return jsonRes(res, { error: error.message }, 400);
      return jsonRes(res, { ok: true });
    }

    return jsonRes(res, { error: "Invalid action" }, 400);
  } catch (e) {
    return jsonRes(res, { error: e.message }, 500);
  }
}

// ── Main server ───────────────────────────────────────────────────
async function startServer() {
  // Start Next.js
  const next = require("next");
  const app = next({ dir: __dirname, dev: false });
  const handle = app.getRequestHandler();

  await app.prepare();
  console.log("> Next.js prepared");

  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const pathname = parsedUrl.pathname;

      // Health check
      if (pathname === "/api/data" && req.method === "GET") {
        jsonRes(res, { ok: true, ts: Date.now() });
        return;
      }

      // /api/data POST — handled by Node.js directly (bypasses Next.js body parsing)
      if (pathname === "/api/data" && req.method === "POST") {
        await handleApiData(req, res);
        return;
      }

      // Everything else → Next.js
      handle(req, res, parsedUrl);
    } catch (e) {
      console.error("Server error:", e);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  }).listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
