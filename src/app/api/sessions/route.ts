import { NextResponse } from "next/server";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import {
  getDaemonInternalConfig,
  notifyDaemonRefreshNip46Relays,
} from "@/lib/daemon-internal";
import { apiGET, apiPOST } from "@/lib/observability/api-route-wrapper";
import { sessionCreateBodySchema, sessionIdentityIdQuerySchema } from "@/lib/schemas/session";
import {
  isRunning,
  restartBunkerSubscriptions,
} from "@/lib/bunker";
import {
  authorizeApp,
  authorizeAppFromNostrConnect,
  listSessions,
} from "@/lib/session/app-keys";
import { parseNostrConnectUri } from "@/lib/session/nostr-connect-uri";
import { getRelayUrlServer } from "@/lib/relay/env";
import { buildBunkerUri } from "@/lib/session/ttl";
import type { Session } from "@/lib/session/ttl";
import { createServiceRoleClient } from "@/lib/supabase/server";

function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    details !== undefined ? { error: message, details } : { error: message },
    { status },
  );
}

function isPgError(e: unknown): e is Error & { pgCode?: string } {
  return e instanceof Error && "pgCode" in e;
}

export type SessionListItem = Omit<Session, "secret_hash">;

function toPublicSession(s: Session): SessionListItem {
  return {
    id: s.id,
    vault_id: s.vault_id,
    app_pubkey: s.app_pubkey,
    app_name: s.app_name,
    nip46_relay_urls: s.nip46_relay_urls,
    used: s.used,
    expires_at: s.expires_at,
    created_at: s.created_at,
  };
}

async function refreshBunkerNip46Relays(identityId: string): Promise<void> {
  try {
    let daemonCfg: ReturnType<typeof getDaemonInternalConfig>;
    try {
      daemonCfg = getDaemonInternalConfig();
    } catch {
      return;
    }
    if (daemonCfg) {
      const out = await notifyDaemonRefreshNip46Relays(daemonCfg, identityId);
      if (!out.ok) {
        console.warn("[POST /api/sessions] daemon refresh-nip46-relays:", out.message);
      }
    } else if (isRunning(identityId)) {
      await restartBunkerSubscriptions(identityId);
    }
  } catch (e) {
    console.warn("[POST /api/sessions] refreshBunkerNip46Relays:", e);
  }
}

/**
 * POST /api/sessions — authorize app, return session_id, secret, bunker_uri.
 */
async function handlePost(request: Request) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = sessionCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  if (parsed.data.identity_id !== cookieIdentityId) {
    return jsonError("Forbidden", 403);
  }

  const { identity_id, app_name, ttl_hours: ttlHoursRaw } = parsed.data;
  const ttl_hours = ttlHoursRaw ?? 24;
  const ncUri = parsed.data.nostrconnect_uri;

  const { data: vault, error: vaultError } = await supabase
    .from("signer_vaults")
    .select("bunker_pubkey")
    .eq("identity_id", identity_id)
    .maybeSingle();

  if (vaultError) {
    return jsonError(vaultError.message, 500);
  }
  if (!vault?.bunker_pubkey) {
    return jsonError("Vault not found for this identity", 404);
  }

  if (ncUri) {
    let parsedNc: ReturnType<typeof parseNostrConnectUri>;
    try {
      parsedNc = parseNostrConnectUri(ncUri);
    } catch (e) {
      return jsonError(
        e instanceof Error ? e.message : "Invalid nostrconnect URI",
        400,
      );
    }

    try {
      const out = await authorizeAppFromNostrConnect(
        identity_id,
        parsedNc,
        app_name,
        ttl_hours,
      );
      await refreshBunkerNip46Relays(identity_id);
      return NextResponse.json({
        session_id: out.sessionId,
        mode: "nostrconnect" as const,
        relays: parsedNc.relayUrls,
        app_name: parsedNc.appName ?? app_name ?? null,
      });
    } catch (e: unknown) {
      if (isPgError(e) && e.pgCode === "23505") {
        return jsonError(
          "Session already exists for this app_pubkey (unexpected conflict)",
          409,
        );
      }
      throw e;
    }
  }

  const appPubkeyRaw = parsed.data.app_pubkey?.trim() ?? "";

  let relayUrl: string;
  try {
    relayUrl = getRelayUrlServer();
  } catch {
    return jsonError(
      "Server misconfigured: RELAY_URL or NEXT_PUBLIC_RELAY_URL is not set",
      503,
    );
  }

  let sessionId: string;
  let secret: string;
  try {
    const out = await authorizeApp(
      identity_id,
      appPubkeyRaw === "" ? null : appPubkeyRaw,
      app_name,
      ttl_hours,
    );
    sessionId = out.sessionId;
    secret = out.secret;
  } catch (e: unknown) {
    if (isPgError(e) && e.pgCode === "23505") {
      return jsonError(
        "Session already exists for this app_pubkey (unexpected conflict)",
        409,
      );
    }
    throw e;
  }

  const bunker_uri = buildBunkerUri(vault.bunker_pubkey, relayUrl, secret);

  return NextResponse.json({
    session_id: sessionId,
    secret,
    bunker_uri,
  });
}

/**
 * GET /api/sessions?identity_id=<uuid> — list sessions for vault (no secret_hash).
 * Requires the session cookie to match `identity_id`.
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

  try {
    createServiceRoleClient();
  } catch {
    return jsonError("Server misconfigured: Supabase service role unavailable", 503);
  }

  const { searchParams } = new URL(request.url);
  const rawId = searchParams.get("identity_id");
  if (!rawId) {
    return jsonError("Query parameter identity_id is required", 400);
  }

  const idResult = sessionIdentityIdQuerySchema.safeParse(rawId);
  if (!idResult.success) {
    return jsonError("Invalid identity_id", 400);
  }

  if (idResult.data !== cookieIdentityId) {
    return jsonError("Forbidden", 403);
  }

  let rows: Session[];
  try {
    rows = await listSessions(idResult.data);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("no vault for identity_id")) {
      return jsonError("Vault not found for this identity", 404);
    }
    throw e;
  }

  return NextResponse.json(rows.map(toPublicSession));
}

export const POST = apiPOST("POST /api/sessions", handlePost);
export const GET = apiGET("GET /api/sessions", handleGet);
