import { supabase } from "@/lib/supabase";

async function postWithRetry(url: string, opts: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, opts);
      // Retry on 502/503/504 (Render cold start / proxy errors)
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e: any) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function dataFetch<T = any>(body: object): Promise<{ data: T | null; error: string | null }> {
  try {
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || "";
    if (!token) return { data: null, error: "Not authenticated" };

    const res = await postWithRetry("/api/data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        if (errData.error) errorMsg = errData.error;
      } catch {
        errorMsg = `Server error (${res.status})`;
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
