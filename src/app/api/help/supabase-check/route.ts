import { resolveServiceRoleSupabaseUrl } from "@/lib/supabase/service-role";
import { apiGET } from "@/lib/observability/api-route-wrapper";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET — TLS/HTTP probe to Supabase REST root from inside the container (same base URL as service-role).
 * No API key sent. Expect 401 or 200 from PostgREST.
 */
async function handleGet(request: Request) {
  void request;
  let base: string;
  try {
    base = resolveServiceRoleSupabaseUrl();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_url_missing",
        message: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  let host: string;
  try {
    host = new URL(base).hostname;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_supabase_url", base },
      { status: 400 },
    );
  }

  const url = `${base.replace(/\/$/, "")}/rest/v1/`;
  const t0 = Date.now();
  let ms: number | null = null;
  let status: number | null = null;
  let errMsg: string | null = null;
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    ms = Date.now() - t0;
    status = res.status;
  } catch (e) {
    ms = Date.now() - t0;
    errMsg = e instanceof Error ? e.message : String(e);
  }

  const ok = errMsg == null && status != null && status < 500;

  return NextResponse.json({
    ok,
    host,
    base,
    rest: { url, ms, status, error: errMsg },
    hint: ok
      ? null
      :       "If this host cannot reach Supabase (Cloudflare) directly, set SUPABASE_SERVICE_ROLE_URL to the VPS relay (bitmacro-cloud supabase-relay). Keep NEXT_PUBLIC_SUPABASE_URL for the browser.",
  });
}

export const GET = apiGET("GET /api/help/supabase-check", handleGet);
