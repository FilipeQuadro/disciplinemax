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
    if (!token) return { data: null, error: "Not authenticated" };
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });

    // Handle non-OK responses (e.g. 502 from Render cold start)
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMsg = errData.error;
      } catch {
        // Response wasn't JSON — likely HTML error page from proxy
        const text = await res.text().catch(() => "");
        if (text) errorMsg = `Server error (${res.status})`;
      }
      return { data: null, error: errorMsg };
    }

    const result = await res.json();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data as T, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
