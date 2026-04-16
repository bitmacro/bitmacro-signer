import { createHash, randomBytes } from "node:crypto";

import { relayConnectLog } from "@bitmacro/relay-connect";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { Session } from "./ttl";

function secretBytesToBase64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function hashSecret(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Same hashing as `authorizeApp` for the base64url secret shown once to the client.
 * @throws if the string is not a valid 32-byte secret encoding
 */
export function hashSecretFromPlaintext(secretBase64Url: string): string {
  const buf = Buffer.from(secretBase64Url, "base64url");
  if (buf.length !== 32) {
    throw new Error("invalid secret: expected 32 bytes after base64url decode");
  }
  return hashSecret(buf);
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
    const err = new Error(
      error?.message ?? "authorizeApp: insert failed",
    ) as Error & { pgCode?: string };
    if (error?.code) err.pgCode = error.code;
    throw err;
  }

  raw.fill(0);
  return { sessionId: data.id, secret };
}

/** Deletes the session row. Returns true if a row was removed, false if id was unknown. */
/**
 * NIP-46 `connect`: validates one-time secret, marks session `used`, then signing RPCs rely on
 * {@link assertAppMayUseSigner} until `expires_at`.
 */
export async function completeConnect(
  identityId: string,
  appPubkey: string,
  secret: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  let secret_hash: string;
  try {
    secret_hash = hashSecretFromPlaintext(secret);
  } catch {
    throw new Error("connect: invalid secret");
  }

  const { data: row, error } = await supabase
    .from("signer_sessions")
    .select("id")
    .eq("vault_id", vaultId)
    .eq("app_pubkey", appPubkey)
    .eq("secret_hash", secret_hash)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`completeConnect: ${error.message}`);
  }
  if (!row?.id) {
    const nowIso = new Date().toISOString();

    const { data: pendingBySecret } = await supabase
      .from("signer_sessions")
      .select("id, app_pubkey, used")
      .eq("vault_id", vaultId)
      .eq("secret_hash", secret_hash)
      .gt("expires_at", nowIso)
      .maybeSingle();

    const { data: consumed } = await supabase
      .from("signer_sessions")
      .select("id")
      .eq("vault_id", vaultId)
      .eq("app_pubkey", appPubkey)
      .eq("secret_hash", secret_hash)
      .eq("used", true)
      .maybeSingle();

    if (
      pendingBySecret &&
      !pendingBySecret.used &&
      pendingBySecret.app_pubkey !== appPubkey
    ) {
      relayConnectLog(
        "warn",
        "completeConnect: app pubkey mismatch (session created for a different npub than this client)",
        {
          component: "app-keys",
          identityId,
          eventAppPrefix: appPubkey.slice(0, 12),
          sessionAppPrefix: pendingBySecret.app_pubkey.slice(0, 12),
        },
      );
      throw new Error(
        "connect: unauthorized — regenerate the QR in the Signer using the npub of this Nostr app (Settings → your pubkey)",
      );
    }

    relayConnectLog(
      "warn",
      "completeConnect: no matching pending session",
      {
        component: "app-keys",
        identityId,
        appPubkeyPrefix: appPubkey.slice(0, 12),
        secretAlreadyUsed: Boolean(consumed?.id),
        unknownSecret: !pendingBySecret?.id,
      },
    );

    if (consumed?.id) {
      throw new Error(
        "connect: secret already used — create a new session in the Signer UI",
      );
    }
    throw new Error(
      "connect: unauthorized or secret already used",
    );
  }

  const { error: upd } = await supabase
    .from("signer_sessions")
    .update({ used: true })
    .eq("id", row.id);

  if (upd) {
    throw new Error(`completeConnect: ${upd.message}`);
  }
}

/**
 * Requires a row with `used === true` (NIP-46 `connect` completed with valid secret) and not expired.
 * Prevents signing before `connect` even if a pending session row exists.
 */
export async function assertAppMayUseSigner(
  identityId: string,
  appPubkey: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const { data, error } = await supabase
    .from("signer_sessions")
    .select("id")
    .eq("vault_id", vaultId)
    .eq("app_pubkey", appPubkey)
    .eq("used", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`assertAppMayUseSigner: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("NIP-46: app not authorized or session expired");
  }
}

export async function revokeApp(sessionId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("signer_sessions")
    .delete()
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`revokeApp: ${error.message}`);
  }
  return data != null;
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
