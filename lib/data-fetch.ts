import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Direct Supabase data fetch with explicit JWT.
 * The singleton client sometimes fails to attach the Authorization header
 * on INSERT/UPDATE/UPSERT (works for SELECT). This creates a one-shot client
 * with the token set in global.headers to guarantee RLS sees auth.uid().
 */
export async function dataFetch<T = any>(body: any): Promise<{ data: T | null; error: string | null }> {
  try {
    if (!supabase) return { data: null, error: "Supabase not configured" };

    // Get fresh session from the singleton client
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { data: null, error: "Not authenticated" };

    // Create a one-shot client with the JWT explicitly in the Authorization header.
    // This guarantees PostgREST sees auth.uid() for RLS policies.
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      },
    });

    const { action, table, filters, payload, id } = body;

    // ── SELECT ──────────────────────────────────────────────────────
    if (action === "select") {
      let query = client.from(table).select(filters?.select || "*");

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
      if (filters?.order) {
        query = query.order(filters.order.column, { ascending: filters.order.ascending ?? false });
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.maybeSingle) {
        const { data, error } = await query.maybeSingle();
        if (error) return { data: null, error: error.message };
        return { data: data as T, error: null };
      }
      const { data, error } = await query;
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    }

    // ── INSERT ──────────────────────────────────────────────────────
    if (action === "insert") {
      const { data, error } = await client.from(table).insert(payload).select();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    }

    // ── UPDATE ──────────────────────────────────────────────────────
    if (action === "update") {
      const { data, error } = await client.from(table).update(payload).eq("id", id).select();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    }

    // ── UPSERT ──────────────────────────────────────────────────────
    if (action === "upsert") {
      const onConflict = ["user_settings", "bible_goals", "user_plans"].includes(table) ? "user_id" : undefined;
      const { data, error } = await client.from(table).upsert(payload, onConflict ? { onConflict } : undefined).select();
      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    }

    // ── DELETE ──────────────────────────────────────────────────────
    if (action === "delete") {
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) return { data: null, error: error.message };
      return { data: null, error: null };
    }

    return { data: null, error: "Invalid action" };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
