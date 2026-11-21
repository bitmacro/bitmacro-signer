import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { getSessionCookie } from "@/lib/auth/session-cookie";
import {
  getDaemonInternalConfig,
  notifyDaemonNostrConnectInitiate,
} from "@/lib/daemon-internal";
import {
  apiDELETE,
  apiGET,
  apiPOST,
  type ParamsBag,
} from "@/lib/observability/api-route-wrapper";
import { pushLokiStructured } from "@/lib/observability/loki-http-push";
import {
  bulkDeleteSessionsBodySchema,
  sessionCreateBodySchema,
  sessionIdentityIdQuerySchema,
} from "@/lib/schemas/session";
import {
  copyRunningBunkerSecretKey,
  isRunning,
  sendNostrConnectInitiate,
} from "@/lib/bunker";
import { syncBunkerAfterSessionChange } from "@/lib/bunker/sync-after-session-change";
import {
  authorizeApp,
  authorizeAppFromNostrConnect,
  completeConnect,
  listSessions,
  revokeAllListableSessionsForIdentity,
  revokeSessionsForIdentity,
} from "@/lib/session/app-keys";
import { resolveSessionScopes } from "@/lib/session/scopes";
import { parseNostrConnectUri } from "@/lib/session/nostr-connect-uri";
import {
  getBunkerRelayUrlServer,
  getNip46FallbackRelayUrlsServer,
} from "@/lib/relay/env";
import {
  buildBunkerUri,
  bunkerPubkeyHexFromBunkerUri,
  relayUrlFromBunkerUri,
} from "@/lib/session/ttl";
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
  let scopes: string[];
  try {
    scopes = resolveSessionScopes(parsed.data.scopes);
  } catch {
    return jsonError("Invalid scopes", 400);
  }

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
        scopes,
      );
      /** Before outbound initiate: align subscriptions with session relays (avoids stop/start racing the client’s kind 24133). */
      await syncBunkerAfterSessionChange(identity_id);

      const daemonCfgNc = getDaemonInternalConfig();
      if (daemonCfgNc) {
        const initOut = await notifyDaemonNostrConnectInitiate(daemonCfgNc, {
          identity_id,
          client_pubkey_hex: parsedNc.clientPubkeyHex,
          relay_urls: parsedNc.relayUrls,
          secret: parsedNc.secret,
        });
        if (!initOut.ok) {
          console.warn(
            "[POST /api/sessions] nostrconnect-initiate:",
            initOut.status,
            initOut.message,
          );
        }
      } else if (isRunning(identity_id)) {
        const sk = copyRunningBunkerSecretKey(identity_id);
        if (sk) {
          try {
            await sendNostrConnectInitiate({
              bunkerPrivkeyBytes: sk,
              clientPubkeyHex: parsedNc.clientPubkeyHex,
              relayUrls: parsedNc.relayUrls,
              secret: parsedNc.secret,
              identityId: identity_id,
              completeConnect: (appPubkeyHex, sec, trace) =>
                completeConnect(identity_id, appPubkeyHex, sec, trace),
            });
          } finally {
            sk.fill(0);
          }
        }
      }
      void pushLokiStructured(
        "info",
        {
          component: "sessions-api",
          event: "nostrconnect_registered",
          journey_id: identity_id.slice(0, 8),
          request_id: randomUUID(),
          message: "POST /api/sessions: nostrconnect URI registered",
          identityIdShort: identity_id.slice(0, 8),
          relayCount: parsedNc.relayUrls.length,
          relaysListed: parsedNc.relayUrls,
          clientPkHexPrefix: parsedNc.clientPubkeyHex.slice(0, 16),
          appNameReturned: parsedNc.appName ?? app_name ?? null,
        },
        { streamLabels: { subsystem: "signer-web-api" } },
      ).catch(() => {
        /* Loki optional */
      });
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
    relayUrl = getBunkerRelayUrlServer();
  } catch {
    return jsonError(
      "Server misconfigured: BUNKER_RELAY_URL, RELAY_URL, or NEXT_PUBLIC_RELAY_URL is not set",
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
      scopes,
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

  /** After relay env or session relays change, re-subscribe (same as nostrconnect path). */
  await syncBunkerAfterSessionChange(identity_id);

  const bunker_uri = buildBunkerUri(
    vault.bunker_pubkey,
    relayUrl,
    secret,
    getNip46FallbackRelayUrlsServer(),
  );

  const relayDecodedFromQr = relayUrlFromBunkerUri(bunker_uri);
  const pkFromQr = bunkerPubkeyHexFromBunkerUri(bunker_uri);
  void pushLokiStructured(
    "info",
    {
      component: "sessions-api",
      event: "session_bunker_qr_issued",
      journey_id: identity_id.slice(0, 8),
      request_id: randomUUID(),
      message:
        "Classic bunker QR: confirm Primal/connect client uses relayInQr — must overlap daemon relayUrls or handshake never reaches nip46-loop",
      identityIdShort: identity_id.slice(0, 8),
      bunkerRelayUsedServer: relayUrl,
      relayInQr: relayDecodedFromQr,
      relayMatchesConfigured: relayDecodedFromQr === relayUrl,
      bunkerPkHexInQrPrefix: pkFromQr?.slice(0, 16) ?? null,
    },
    { streamLabels: { subsystem: "signer-web-api" } },
  ).catch(() => {});

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

/**
 * DELETE /api/sessions — bulk revoke (`{ ids: uuid[] }` or `{ all: true }`).
 * Optional query: `?all=true` / repeated `ids=`; merged with JSON body when both present.
 */
async function handleBulkDelete(request: Request, _context: ParamsBag) {
  void _context;
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

  const url = new URL(request.url);
  const allFromQuery = url.searchParams.get("all") === "true";
  const idsFromQuery = url.searchParams.getAll("ids").filter(Boolean);

  let bodyJson: unknown;
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      bodyJson = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
  }

  const parsedRaw =
    bodyJson !== undefined && typeof bodyJson === "object" && bodyJson !== null
      ? { ...(bodyJson as Record<string, unknown>) }
      : {};
  if (idsFromQuery.length > 0) {
    const existing = parsedRaw.ids;
    parsedRaw.ids =
      Array.isArray(existing) && existing.every((x) => typeof x === "string")
        ? [...(existing as string[]), ...idsFromQuery]
        : idsFromQuery;
  }
  if (allFromQuery) {
    parsedRaw.all = true;
  }

  const parsed = bulkDeleteSessionsBodySchema.safeParse(parsedRaw);
  if (!parsed.success) {
    return jsonError("Validation failed", 400, parsed.error.flatten());
  }

  try {
    if (parsed.data.all === true) {
      const out = await revokeAllListableSessionsForIdentity(cookieIdentityId);
      if (out.removed > 0) {
        await syncBunkerAfterSessionChange(cookieIdentityId);
      }
      return NextResponse.json(out);
    }
    const ids = parsed.data.ids ?? [];
    const out = await revokeSessionsForIdentity(cookieIdentityId, ids);
    if (out.removed > 0) {
      await syncBunkerAfterSessionChange(cookieIdentityId);
    }
    return NextResponse.json(out);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("no vault for identity_id")) {
      return jsonError("Vault not found for this identity", 404);
    }
    throw e;
  }
}

export const POST = apiPOST("POST /api/sessions", handlePost);
export const GET = apiGET("GET /api/sessions", handleGet);
export const DELETE = apiDELETE("DELETE /api/sessions", handleBulkDelete);
