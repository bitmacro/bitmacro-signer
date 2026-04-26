import { apiGET } from "@/lib/observability/api-route-wrapper";

/**
 * Liveness/readiness endpoint for Docker and load balancers — validate Supabase/relay when logic is added.
 */
async function handleGet(_request: Request) {
  return Response.json({ ok: true });
}

export const GET = apiGET("GET /api/health", handleGet);
