/**
 * Intenção: endpoint de liveness/readiness para Docker e balanceadores — validar Supabase/relay quando existir lógica.
 */
export async function GET() {
  return Response.json({ ok: true });
}
