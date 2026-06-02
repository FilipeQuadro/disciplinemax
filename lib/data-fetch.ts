import { supabase } from "@/lib/supabase";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FETCH_TIMEOUT = 10_000;

function restUrl(table: string) {
  return `${supabaseUrl}/rest/v1/${table}`;
}

function authHeaders(token: string): Record<string, string> {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/**
 * Direct Supabase REST API calls via fetch — no createClient overhead.
 * Gets the JWT from the singleton's session, then calls PostgREST directly.
 */
export async function dataFetch<T = any>(body: any): Promise<{ data: T | null; error: string | null }> {
  try {
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { data: null, error: "Not authenticated" };

    const token = session.access_token;
    const { action, table, filters, payload, id } = body;

    // ── SELECT ──────────────────────────────────────────────────────
    if (action === "select") {
      const params = new URLSearchParams();
      if (filters?.select) params.set("select", filters.select);

      if (filters?.eq) {
        for (const [key, value] of Object.entries(filters.eq)) {
          params.set(key, `eq.${value}`);
        }
      }
      if (filters?.gte) {
        for (const [key, value] of Object.entries(filters.gte)) {
          params.set(key, `gte.${value}`);
        }
      }
      if (filters?.order) {
        params.set("order", `${filters.order.column}.${filters.order.ascending ? "asc" : "desc"}`);
      }
      if (filters?.limit) {
        params.set("limit", String(filters.limit));
      }

      const qs = params.toString();
      const res = await fetchWithTimeout(`${restUrl(table)}${qs ? `?${qs}` : ""}`, {
        headers: authHeaders(token),
      }, FETCH_TIMEOUT);
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.message || json.msg || JSON.stringify(json) };

      if (filters?.maybeSingle) {
        return { data: (Array.isArray(json) ? json[0] ?? null : json) as T, error: null };
      }
      return { data: json as T, error: null };
    }

    // ── INSERT ──────────────────────────────────────────────────────
    if (action === "insert") {
      const res = await fetchWithTimeout(restUrl(table), {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }, FETCH_TIMEOUT);
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.message || json.msg || JSON.stringify(json) };
      return { data: (Array.isArray(json) ? json[0] : json) as T, error: null };
    }

    // ── UPDATE ──────────────────────────────────────────────────────
    if (action === "update") {
      const params = new URLSearchParams({ id: `eq.${id}` });
      const res = await fetchWithTimeout(`${restUrl(table)}?${params}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify(payload),
      }, FETCH_TIMEOUT);
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.message || json.msg || JSON.stringify(json) };
      return { data: (Array.isArray(json) ? json[0] : json) as T, error: null };
    }

    // ── UPSERT ──────────────────────────────────────────────────────
    if (action === "upsert") {
      const headers = authHeaders(token);
      const onConflict = ["user_settings", "bible_goals", "user_plans"].includes(table) ? "user_id" : undefined;
      if (onConflict) {
        headers["Prefer"] = `return=representation,resolution=merge-duplicates`;
        // PostgREST uses the Prefer header for upsert conflict resolution
        // and the unique column must be in the query string
      }
      const params = onConflict ? new URLSearchParams({ on_conflict: onConflict }) : new URLSearchParams();
      const res = await fetchWithTimeout(`${restUrl(table)}${params.toString() ? `?${params}` : ""}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }, FETCH_TIMEOUT);
      const json = await res.json();
      if (!res.ok) return { data: null, error: json.message || json.msg || JSON.stringify(json) };
      return { data: (Array.isArray(json) ? json[0] : json) as T, error: null };
    }

    // ── DELETE ──────────────────────────────────────────────────────
    if (action === "delete") {
      const params = new URLSearchParams({ id: `eq.${id}` });
      const res = await fetchWithTimeout(`${restUrl(table)}?${params}`, {
        method: "DELETE",
        headers: { ...authHeaders(token), Prefer: "return=minimal" },
      }, FETCH_TIMEOUT);
      if (!res.ok) {
        const json = await res.json();
        return { data: null, error: json.message || json.msg || JSON.stringify(json) };
      }
      return { data: null, error: null };
    }

    return { data: null, error: "Invalid action" };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
