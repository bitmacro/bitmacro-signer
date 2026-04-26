import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import { apiGET, apiPOST } from "@/lib/observability/api-route-wrapper";
import { vaultCreateBodySchema } from "@/lib/schemas/vault";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

/**
 * POST /api/vault — create signer_vaults row after verifying identity exists.
 */
async function handlePost(request: Request) {
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

  const parsed = vaultCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { identity_id, blob, salt, iv, bunker_pubkey } = parsed.data;

  const { data: identity, error: identityError } = await supabase
    .from("identities")
    .select("id")
    .eq("id", identity_id)
    .maybeSingle();

  if (identityError) {
    return jsonError(identityError.message, 500);
  }
  if (!identity) {
    return jsonError("Identity not found", 404);
  }

  const { data: vault, error: insertError } = await supabase
    .from("signer_vaults")
    .insert({
      identity_id,
      blob,
      salt,
      iv,
      bunker_pubkey,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return jsonError("Vault already exists for this identity", 409);
    }
    return jsonError(insertError.message, 500);
  }

  if (!vault?.id) {
    return jsonError("Insert did not return vault id", 500);
  }

  return NextResponse.json({ vault_id: vault.id });
}

/**
 * GET /api/vault?identity_id=<uuid> — fetch vault ciphertext fields by identity.
 * Requires session cookie matching `identity_id` (same as other authenticated routes).
 */
async function handleGet(request: Request) {
  let cookieIdentityId: string | null;
  try {
    cookieIdentityId = await getSessionCookie();
  } catch {
    return jsonError("Server misconfigured: session support unavailable", 503);
  }
  if (!cookieIdentityId) {
    return jsonError("Unauthorized", 401);
  }

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("identity_id");
  if (!rawId) {
    return jsonError("Query parameter identity_id is required", 400);
  }

  const idResult = vaultCreateBodySchema.shape.identity_id.safeParse(rawId);
  if (!idResult.success) {
    return jsonError("Invalid identity_id", 400);
  }

  if (idResult.data !== cookieIdentityId) {
    return jsonError("Forbidden", 403);
  }

  const { data, error } = await supabase
    .from("signer_vaults")
    .select("blob, salt, iv, bunker_pubkey")
    .eq("identity_id", idResult.data)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }
  if (!data) {
    return jsonError("Vault not found", 404);
  }

  return NextResponse.json({
    blob: data.blob,
    salt: data.salt,
    iv: data.iv,
    bunker_pubkey: data.bunker_pubkey,
  });
}

export const POST = apiPOST("POST /api/vault", handlePost);
export const GET = apiGET("GET /api/vault", handleGet);
