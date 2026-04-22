import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

/**
 * Base URL for service-role RPC/REST from Node (Docker). When the host cannot reach
 * `*.supabase.co` directly, set `SUPABASE_SERVICE_ROLE_URL` to the VPS relay
 * (e.g. `http://10.0.0.1:8091`). Browser/session code keeps using `NEXT_PUBLIC_SUPABASE_URL`.
 */
export function resolveServiceRoleSupabaseUrl(): string {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_URL,
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];
  for (const raw of candidates) {
    const u = raw?.trim();
    if (u) return u.replace(/\/$/, "");
  }
  throw new Error(
    "Missing Supabase URL for service role: set SUPABASE_SERVICE_ROLE_URL, SUPABASE_URL, or NEXT_PUBLIC_SUPABASE_URL",
  );
}

/**
 * Service-role Supabase client (Node / API / daemon). No Next.js cookies — safe to bundle for standalone processes.
 * Browser-oriented `createClient()` stays in `server.ts`.
 */
export function createServiceRoleClient() {
  const url = resolveServiceRoleSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY for service role access",
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
