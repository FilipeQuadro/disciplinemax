import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Shared service-role Supabase client singleton.
 * All repositories and services should use this instead of creating their own client.
 * Reduces connection overhead and prevents multiple client instantiations per request.
 */
let _client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (_client) return _client;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase service-role credentials not configured");
  }
  _client = createClient(supabaseUrl, supabaseKey);
  return _client;
}

/**
 * Reset the singleton (useful for testing with custom clients).
 */
export function resetServiceClient(): void {
  _client = null;
}
