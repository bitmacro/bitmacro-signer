import { createHash, randomBytes } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/server";

import type { Session } from "./ttl";

function secretBytesToBase64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function hashSecret(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Resolves signer_vaults.id for a BitMacro Identity. Expects a row to exist.
 * Server must use a Supabase client with permission to read signer_vaults (e.g. service role).
 */
async function getVaultIdForIdentity(
  supabase: SupabaseClient,
  identityId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("signer_vaults")
    .select("id")
    .eq("identity_id", identityId)
    .maybeSingle();

  if (error) {
    throw new Error(`getVaultIdForIdentity: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error(
      `getVaultIdForIdentity: no vault for identity_id=${identityId}`,
    );
  }
  return data.id;
}

/**
 * Authorize an app pubkey for an Identity: resolves vault by `identity_id`, then creates
 * a session row with sha256(secret) only. Any prior session for the same (vault, app_pubkey) is removed.
 * Returns the plaintext `secret` once — never persisted; do not log it.
 */
export async function authorizeApp(
  identityId: string,
  appPubkey: string,
  appName?: string,
  ttlHours = 24,
): Promise<{ sessionId: string; secret: string }> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const raw = randomBytes(32);
  const secret = secretBytesToBase64Url(raw);
  const secret_hash = hashSecret(raw);

  const { error: delErr } = await supabase
    .from("signer_sessions")
    .delete()
    .eq("vault_id", vaultId)
    .eq("app_pubkey", appPubkey);

  if (delErr) {
    throw new Error(`authorizeApp: failed to clear prior session — ${delErr.message}`);
  }

  const expires_at = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("signer_sessions")
    .insert({
      vault_id: vaultId,
      app_pubkey: appPubkey,
      app_name: appName ?? null,
      secret_hash,
      used: false,
      expires_at,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ?? "authorizeApp: insert failed",
    );
  }

  raw.fill(0);
  return { sessionId: data.id, secret };
}

export async function revokeApp(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("signer_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    throw new Error(`revokeApp: ${error.message}`);
  }
}

/**
 * Lists sessions for the vault belonging to this Identity.
 */
export async function listSessions(identityId: string): Promise<Session[]> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const { data, error } = await supabase
    .from("signer_sessions")
    .select(
      "id, vault_id, app_pubkey, app_name, secret_hash, used, expires_at, created_at",
    )
    .eq("vault_id", vaultId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`listSessions: ${error.message}`);
  }

  return (data ?? []) as Session[];
}
