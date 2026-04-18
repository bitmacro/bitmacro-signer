/**
 * Liveness/readiness endpoint for Docker and load balancers — validate Supabase/relay when logic is added.
 */
export async function GET() {
  return Response.json({ ok: true });
}
