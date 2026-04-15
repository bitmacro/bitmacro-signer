import { NextResponse } from "next/server";

import { identityBootstrapBodySchema } from "@/lib/schemas/identity";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

/**
 * POST /api/identities/bootstrap — garante uma linha em `identities` para o npub (idempotente).
 * Usado pelo fluxo «Não tenho npub ainda» no onboarding antes de POST /api/vault.
 */
export async function POST(request: Request) {
  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = identityBootstrapBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { npub } = parsed.data;

  const { data: existing, error: selErr } = await supabase
    .from("identities")
    .select("id")
    .eq("npub", npub)
    .maybeSingle();

  if (selErr) {
    return jsonError(selErr.message, 500);
  }
  if (existing?.id) {
    return NextResponse.json({
      identity_id: existing.id as string,
      created: false,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("identities")
    .insert({ npub })
    .select("id")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: race } = await supabase
        .from("identities")
        .select("id")
        .eq("npub", npub)
        .maybeSingle();
      if (race?.id) {
        return NextResponse.json({
          identity_id: race.id as string,
          created: false,
        });
      }
    }
    return jsonError(insErr.message, 500);
  }

  if (!inserted?.id) {
    return jsonError("Insert did not return identity id", 500);
  }

  return NextResponse.json({
    identity_id: inserted.id as string,
    created: true,
  });
}
