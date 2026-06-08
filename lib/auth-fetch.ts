import { supabase } from "@/lib/supabase";

/**
 * Authenticated fetch wrapper for client-to-API calls.
 * Automatically adds the Authorization header with the current session token.
 *
 * Usage: replace `fetch(url, opts)` with `authFetch(url, opts)`
 * in any client component that calls an API route requiring authentication.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);

  // Get the current session token
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
