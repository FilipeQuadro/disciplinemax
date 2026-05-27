import { supabase } from "@/lib/supabase";

/**
 * Generic data fetch via /api/data (service_role, bypasses RLS).
 * Always includes the user's auth token for verification.
 */
export async function dataFetch<T = any>(body: object): Promise<{ data: T | null; error: string | null }> {
  try {
    if (!supabase) return { data: null, error: "Supabase not configured" };
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data as T, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
