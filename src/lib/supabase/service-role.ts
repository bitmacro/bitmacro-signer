import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (Node / API / daemon). No Next.js cookies — safe to bundle for standalone processes.
 * Browser-oriented `createClient()` stays in `server.ts`.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for service role access",
    );
  }
  return createSupabaseJsClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
