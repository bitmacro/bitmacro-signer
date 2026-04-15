import { NextResponse } from "next/server";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { authUnlockBodySchema } from "@/lib/schemas/auth";
import { isRunning, startBunker, stopBunker } from "@/lib/bunker";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { VaultDecryptError, decryptNsec } from "@/lib/vault";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

/**
 * POST /api/auth/unlock — resolve identity by npub, decrypt vault with passphrase, start bunker, session cookie.
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

  const parsed = authUnlockBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  const { npub, passphrase } = parsed.data;

  const { data: identity, error: idErr } = await supabase
    .from("identities")
    .select("id")
    .eq("npub", npub)
    .maybeSingle();

  if (idErr) {
    return jsonError(idErr.message, 500);
  }
  if (!identity?.id) {
    return jsonError("Npub not registered", 404);
  }

  const identity_id = identity.id as string;

  const { data: vault, error: vaultErr } = await supabase
    .from("signer_vaults")
    .select("blob, salt, iv")
    .eq("identity_id", identity_id)
    .maybeSingle();

  if (vaultErr) {
    return jsonError(vaultErr.message, 500);
  }
  if (!vault?.blob || !vault?.salt || !vault?.iv) {
    return NextResponse.json({
      ok: true,
      vault_exists: false,
      identity_id,
      is_running: false,
    });
  }

  let nsec: string;
  try {
    nsec = await decryptNsec(
      { blob: vault.blob, salt: vault.salt, iv: vault.iv },
      passphrase,
    );
  } catch (e) {
    if (e instanceof VaultDecryptError) {
      return jsonError("Passphrase incorrecta", 401);
    }
    throw e;
  }

  /*
   * TODO: startBunker aqui é placeholder para desenvolvimento local.
   * Em produção o daemon corre no EQ14 via Dockerfile.daemon.
   * A API route faz apenas auth + cookie; o daemon escuta por si próprio.
   */
  try {
    await startBunker(identity_id, nsec);
  } catch (e) {
    nsec = "";
    const msg = e instanceof Error ? e.message : "Failed to start bunker";
    return jsonError(msg, 502);
  } finally {
    nsec = "";
  }

  try {
    await setSessionCookie(identity_id);
  } catch (e) {
    await stopBunker(identity_id).catch(() => {});
    const msg =
      e instanceof Error ? e.message : "Failed to set session cookie";
    return jsonError(msg, 503);
  }

  return NextResponse.json({
    ok: true,
    vault_exists: true,
    identity_id,
    is_running: isRunning(identity_id),
  });
}
