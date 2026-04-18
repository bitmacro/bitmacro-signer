import { createHash, randomBytes, randomUUID } from "node:crypto";

import { relayConnectLog } from "@bitmacro/relay-connect";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { Session } from "./ttl";
import { nostrPubkeyInputToHex } from "./ttl";

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

const PENDING_APP_PUBKEY_PREFIX = "pending:" as const;

/**
 * Authorize a NIP-46 session: resolves vault by `identity_id`, creates a row with sha256(secret).
 * If `appPubkey` is null/empty, stores `pending:<uuid>` until `connect` (NIP-46: client-keypair pubkey
 * is learned from the first kind:24133 event, not the user's profile npub).
 * Clears any **unused** session rows for this vault (novo QR invalida pares pendentes).
 * Returns the plaintext `secret` once — never persisted; do not log it.
 */
export async function authorizeApp(
  identityId: string,
  appPubkey: string | null,
  appName?: string,
  ttlHours = 24,
): Promise<{ sessionId: string; secret: string }> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const raw = randomBytes(32);
  const secret = secretBytesToBase64Url(raw);
  const secret_hash = hashSecret(raw);

  let resolvedAppPk: string;
  if (appPubkey?.trim()) {
    try {
      resolvedAppPk = nostrPubkeyInputToHex(appPubkey.trim());
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : "app_pubkey: invalid npub or hex",
      );
    }
  } else {
    resolvedAppPk = `${PENDING_APP_PUBKEY_PREFIX}${randomUUID()}`;
  }

  const { error: delErr } = await supabase
    .from("signer_sessions")
    .delete()
    .eq("vault_id", vaultId)
    .eq("used", false);

  if (delErr) {
    throw new Error(`authorizeApp: failed to clear pending sessions — ${delErr.message}`);
  }

  const expires_at = new Date(
    Date.now() + ttlHours * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("signer_sessions")
    .insert({
      vault_id: vaultId,
      app_pubkey: resolvedAppPk,
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

function connectSecretDiagnostics(secret: string): {
  secretCharLen: number;
  trimmedCharLen: number;
  looksEmpty: boolean;
  base64urlDecodedByteLen: number;
} {
  const trimmed = secret.trim();
  const buf = Buffer.from(trimmed, "base64url");
  return {
    secretCharLen: secret.length,
    trimmedCharLen: trimmed.length,
    looksEmpty: trimmed.length === 0,
    base64urlDecodedByteLen: buf.length,
  };
}

/**
 * NIP-46 `connect`: validates one-time secret, marks session `used`, then signing RPCs rely on
 * {@link assertAppMayUseSigner} until `expires_at`.
 *
 * If the same client retries `connect` with an already-consumed secret (same app pubkey), succeeds
 * idempotently so Welshman/Primal retries do not surface as bunker errors.
 */
export async function completeConnect(
  identityId: string,
  appPubkey: string,
  secret: string,
  trace?: { rpcId?: string },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const appPkNorm = appPubkey.trim().toLowerCase();
  const diag = connectSecretDiagnostics(secret);
  let secret_hash: string;
  try {
    secret_hash = hashSecretFromPlaintext(secret);
  } catch {
    relayConnectLog("warn", "completeConnect: invalid secret encoding", {
      component: "app-keys",
      identityId,
      rpcId: trace?.rpcId,
      failureCode: "INVALID_SECRET_ENCODING" as const,
      eventAppPrefix: appPkNorm.slice(0, 12),
      ...diag,
    });
    throw new Error("connect: invalid secret");
  }

  const { data: row, error } = await supabase
    .from("signer_sessions")
    .select("id, app_pubkey")
    .eq("vault_id", vaultId)
    .eq("secret_hash", secret_hash)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(`completeConnect: ${error.message}`);
  }

  if (!row?.id) {
    const { data: consumed } = await supabase
      .from("signer_sessions")
      .select("id, app_pubkey")
      .eq("vault_id", vaultId)
      .eq("secret_hash", secret_hash)
      .eq("used", true)
      .maybeSingle();

    const consumedPk = consumed?.app_pubkey?.trim().toLowerCase() ?? "";
    const sameClientRetry =
      Boolean(consumed?.id) &&
      consumedPk === appPkNorm &&
      !consumedPk.startsWith(PENDING_APP_PUBKEY_PREFIX);

    if (sameClientRetry && consumed?.id) {
      relayConnectLog(
        "info",
        "completeConnect: idempotent (duplicate connect, same client pubkey)",
        {
          component: "app-keys",
          identityId,
          rpcId: trace?.rpcId,
          failureCode: "CONNECT_IDEMPOTENT_OK" as const,
          sessionId: consumed.id,
          eventAppPrefix: appPkNorm.slice(0, 12),
          secretHashPrefix: secret_hash.slice(0, 12),
        },
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const { data: openPendingRows } = await supabase
      .from("signer_sessions")
      .select("id, secret_hash, app_pubkey")
      .eq("vault_id", vaultId)
      .eq("used", false)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(5);

    const openPendingSnapshot = (openPendingRows ?? []).map((r) => ({
      sessionId: r.id,
      secretHashPrefix: r.secret_hash.slice(0, 12),
      matchesIncomingSecretHash: r.secret_hash === secret_hash,
      appPubkeyKind: r.app_pubkey.startsWith(PENDING_APP_PUBKEY_PREFIX)
        ? ("pending_placeholder" as const)
        : ("bound_npub" as const),
    }));

    const latestOpen = openPendingSnapshot[0];
    const secretMismatchVersusLatestPending =
      latestOpen && !latestOpen.matchesIncomingSecretHash;

    relayConnectLog(
      "warn",
      "completeConnect: no matching pending session",
      {
        component: "app-keys",
        identityId,
        rpcId: trace?.rpcId,
        failureCode: consumed?.id
          ? ("SECRET_ALREADY_USED" as const)
          : ("NO_PENDING_SESSION" as const),
        eventAppPrefix: appPkNorm.slice(0, 12),
        secretHashPrefix: secret_hash.slice(0, 12),
        consumedSessionId: consumed?.id ?? null,
        consumedClientMatches:
          consumed?.id != null ? consumedPk === appPkNorm : null,
        openPendingCount: openPendingSnapshot.length,
        openPendingSnapshot,
        hint:
          secretMismatchVersusLatestPending === true
            ? ("CONNECT_SECRET_DOES_NOT_MATCH_LATEST_PENDING_QR" as const)
            : openPendingSnapshot.length === 0
              ? ("NO_OPEN_SESSION_IN_VAULT" as const)
              : ("CHECK_SECRET_AND_CLIENT_KEY_STABILITY" as const),
        ...diag,
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

  const isPendingPlaceholder = row.app_pubkey.startsWith(
    PENDING_APP_PUBKEY_PREFIX,
  );
  if (
    !isPendingPlaceholder &&
    row.app_pubkey.toLowerCase() !== appPkNorm
  ) {
    relayConnectLog(
      "warn",
      "completeConnect: app pubkey mismatch (session was bound to a specific npub)",
      {
        component: "app-keys",
        identityId,
        failureCode: "APP_PUBKEY_MISMATCH" as const,
        eventAppPrefix: appPkNorm.slice(0, 12),
        sessionAppPrefix: row.app_pubkey.slice(0, 12),
        sessionId: row.id,
      },
    );
    throw new Error(
      "connect: unauthorized — this QR was generated for a different client pubkey",
    );
  }

  const updatePayload = isPendingPlaceholder
    ? { used: true as const, app_pubkey: appPkNorm }
    : { used: true as const };

  const { error: upd } = await supabase
    .from("signer_sessions")
    .update(updatePayload)
    .eq("id", row.id);

  if (upd) {
    throw new Error(`completeConnect: ${upd.message}`);
  }

  relayConnectLog("info", "completeConnect: session bound (NIP-46 connect ok)", {
    component: "app-keys",
    identityId,
    rpcId: trace?.rpcId,
    sessionId: row.id,
    eventAppPrefix: appPkNorm.slice(0, 12),
    wasPendingPlaceholder: isPendingPlaceholder,
    secretHashPrefix: secret_hash.slice(0, 12),
  });
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
  const pk = appPubkey.trim().toLowerCase();
  const { data, error } = await supabase
    .from("signer_sessions")
    .select("id")
    .eq("vault_id", vaultId)
    .eq("app_pubkey", pk)
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

/**
 * Deletes a client session row if it belongs to this Identity’s vault.
 * Used by the Signer UI after cookie auth (do not expose unscoped delete by id).
 */
export async function revokeSessionForIdentity(
  identityId: string,
  sessionId: string,
): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const vaultId = await getVaultIdForIdentity(supabase, identityId);
  const { data, error } = await supabase
    .from("signer_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("vault_id", vaultId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`revokeSessionForIdentity: ${error.message}`);
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

  const rows = (data ?? []) as Session[];
  return rows.filter(
    (s) => !s.app_pubkey.startsWith(PENDING_APP_PUBKEY_PREFIX),
  );
}
