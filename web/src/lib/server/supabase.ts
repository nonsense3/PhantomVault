import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/server/env";

/**
 * Returns a server-side Supabase client initialized with the service role key
 * (which bypasses RLS for server-side orchestrations as specified in PRD 7.1 AUTH-5 & 14.1),
 * or returns null if keys have not been configured yet.
 */
export function getSupabaseAdmin() {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Returns a Supabase client configured with the public anonymous key.
 */
export function getSupabaseClient() {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  return createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
