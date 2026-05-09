/**
 * NIP-46 bunker loop: WebSocket to relay, kind 24133 — inbound RPC tries **NIP-44** then **NIP-04**; responses use NIP-44.
 * Outbound `sendNostrConnectInitiate` uses NIP-04 for the envelope (mainstream nostrconnect clients).
 */

import { randomUUID } from "node:crypto";

import { bytesToHex } from "@noble/hashes/utils.js";
import { relayConnectLog } from "@bitmacro/relay-connect";
import type { Event } from "nostr-tools";
import { finalizeEvent, getPublicKey } from "nostr-tools";
import * as nip04 from "nostr-tools/nip04";
import * as nip19 from "nostr-tools/nip19";
import * as nip44 from "nostr-tools/nip44";
import { Relay } from "nostr-tools/relay";
import { NostrConnect } from "nostr-tools/kinds";

import {
  assertAppMayUseSigner,
  completeConnect,
  getActiveNip46RelayUrlsForIdentity,
} from "@/lib/session/app-keys";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  NOSTR_CONNECT_KIND,
  parseNip46RpcPayload,
  decryptNip46InboundEventContent,
  runNip46Method,
  type Nip46RpcResult,
} from "./nip46-methods";

function log(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
): void {
  relayConnectLog(level, message, { component: "nip46-loop", ...context });
}

/** nostr-tools `AbstractRelay` rejects with plain strings in some paths (e.g. `connection failed`). */
function thrownReason(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}

/** Dedup + sort URLs for comparing subscription sets across refresh-nip46-relays. */
function relaySetFingerprint(urls: string[]): string {
  const norm = urls
    .map((u) => u.trim())
    .filter(Boolean)
    .map((u) => (u.endsWith("/") ? u.slice(0, -1) : u));
  return [...new Set(norm)].sort().join("|");
}

function defaultRamTtlMs(): number {
  const raw = process.env.BUNKER_SESSION_RAM_TTL_MS;
  if (raw && /^\d+$/.test(raw.trim())) {
    return Number.parseInt(raw.trim(), 10);
  }
  return 24 * 60 * 60 * 1000;
}

/** After unlock, log once if no kind 24133 arrived (Grafana: "connected but deaf"). 0 = off. */
function idleInboundWarnMs(): number {
  const raw = process.env.BUNKER_IDLE_INBOUND_WARN_MS;
  if (raw?.trim() === "0") return 0;
  if (raw && /^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(), 10);
  return 120_000;
}

function clearIdleInboundWarnTimer(identityId: string): void {
  const rt = active.get(identityId);
  if (!rt?.idleInboundWarnTimer) return;
  clearTimeout(rt.idleInboundWarnTimer);
  rt.idleInboundWarnTimer = undefined;
}

function decodeNsec(nsec: string): Uint8Array {
  const d = nip19.decode(nsec.trim());
  if (d.type !== "nsec") {
    throw new Error("nip46-loop: expected nsec bech32");
  }
  return new Uint8Array(d.data);
}

type RelaySubscription = {
  relay: Relay;
  sub: { close: (reason?: string) => void };
  relayUrl: string;
};

type BunkerRuntime = {
  secretKey: Uint8Array;
  bunkerPubkeyHex: string;
  relaySubs: RelaySubscription[];
  ttlTimer: ReturnType<typeof setTimeout>;
  idleInboundWarnTimer?: ReturnType<typeof setTimeout>;
};

const active = new Map<string, BunkerRuntime>();

export function isRunning(identityId: string): boolean {
  return active.has(identityId);
}

/**
 * Copy of the running bunker secret key for one-shot outbound Nostr Connect initiator only.
 * Caller must `fill(0)` when done if holding a copy.
 */
export function copyRunningBunkerSecretKey(identityId: string): Uint8Array | null {
  const rt = active.get(identityId);
  if (!rt) return null;
  return new Uint8Array(rt.secretKey);
}

/** Process shutdown: stop all active bunkers. */
export async function stopAllBunkers(): Promise<void> {
  const ids = [...active.keys()];
  for (const id of ids) {
    await stopBunker(id);
  }
}

function clearSecretKeyBytes(sk: Uint8Array): void {
  sk.fill(0);
}

/**
 * Re-subscribe on all relays needed for open sessions (e.g. after registering `nostrconnect://`).
 * No-op if this process has no active bunker for the identity.
 */
export async function restartBunkerSubscriptions(
  identityId: string,
): Promise<void> {
  const rt = active.get(identityId);
  if (!rt) return;

  let nextRelayUrls: string[] | null = null;
  try {
    nextRelayUrls = await getActiveNip46RelayUrlsForIdentity(identityId);
  } catch (e) {
    log("warn", "restartBunkerSubscriptions: could not load next relay URLs from DB — will recycle bunker", {
      identityId,
      err: e instanceof Error ? e.message : String(e),
    });
    /* fall through: cannot compare fingerprints; safest to restart subscriptions */
  }

  const currentFp = relaySetFingerprint(rt.relaySubs.map((s) => s.relayUrl));
  const nextFp =
    nextRelayUrls !== null ? relaySetFingerprint(nextRelayUrls) : null;

  log("info", "restartBunkerSubscriptions: fingerprint check", {
    identityId,
    currentFingerprint: currentFp.slice(0, 200),
    nextFingerprintPreview:
      nextFp !== null ? nextFp.slice(0, 200) : "(unavailable)",
    currentRelayUrls: rt.relaySubs.map((s) => s.relayUrl),
    nextRelayUrls: nextRelayUrls ?? null,
    willRecycle:
      nextRelayUrls === null || relaySetFingerprint(nextRelayUrls) !== currentFp,
  });

  if (
    nextRelayUrls !== null &&
    relaySetFingerprint(nextRelayUrls) === currentFp
  ) {
    log(
      "info",
      "bunker relay set unchanged — skip subscription restart (avoids nip46 flap)",
      {
        identityId,
        relayCount: rt.relaySubs.length,
      },
    );
    return;
  }

  log("info", "restartBunkerSubscriptions: relay set changed — stopBunker + startBunker", {
    identityId,
    previousRelayCount: rt.relaySubs.length,
  });

  const skCopy = new Uint8Array(rt.secretKey);
  let nsec = "";
  try {
    nsec = nip19.nsecEncode(skCopy);
  } finally {
    skCopy.fill(0);
  }
  try {
    await stopBunker(identityId);
    await startBunker(identityId, nsec);
  } finally {
    nsec = "";
  }
}

export async function stopBunker(identityId: string): Promise<void> {
  const rt = active.get(identityId);
  if (!rt) return;

  clearTimeout(rt.ttlTimer);
  if (rt.idleInboundWarnTimer) clearTimeout(rt.idleInboundWarnTimer);
  for (const { sub, relay } of rt.relaySubs) {
    try {
      sub.close();
    } catch {
      /* ignore */
    }
    try {
      relay.close();
    } catch {
      /* ignore */
    }
  }
  clearSecretKeyBytes(rt.secretKey);
  active.delete(identityId);
  log("info", "bunker stopped", { identityId });
}

async function verifyVaultMatchesNsec(
  identityId: string,
  secretKey: Uint8Array,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("signer_vaults")
    .select("bunker_pubkey")
    .eq("identity_id", identityId)
    .maybeSingle();

  if (error) {
    throw new Error(`vault lookup: ${error.message}`);
  }
  const expectedNpub = nip19.npubEncode(getPublicKey(secretKey));
  const stored = data?.bunker_pubkey?.trim();
  if (!stored) {
    throw new Error("no vault / bunker_pubkey for this identity");
  }
  if (stored !== expectedNpub) {
    throw new Error("nsec does not match vault bunker_pubkey");
  }
}

/**
 * Starts the NIP-46 listener for this identity: decrypts requests, enforces `signer_sessions`, publishes responses.
 * @param nsec — bech32 `nsec1…` exported from the client vault flow
 */
export async function startBunker(
  identityId: string,
  nsec: string,
): Promise<void> {
  if (active.has(identityId)) {
    await stopBunker(identityId);
  }

  const secretKey = decodeNsec(nsec);
  const bunkerPubkeyHex = getPublicKey(secretKey);

  await verifyVaultMatchesNsec(identityId, secretKey);

  const relayUrls = await getActiveNip46RelayUrlsForIdentity(identityId);

  log("info", "startBunker: resolved NIP-46 relay URLs (vault + session union)", {
    identityId,
    bunkerPkPrefix: bunkerPubkeyHex.slice(0, 12),
    relayCount: relayUrls.length,
    relayUrls,
    relayFingerprint: relaySetFingerprint(relayUrls),
    nip46KindFilter: NOSTR_CONNECT_KIND,
    relayEnvDefaultNote:
      "first URL is typically RELAY_URL on daemon; extras from signer_sessions.nip46_relay_urls",
  });

  const filters = [
    {
      kinds: [NOSTR_CONNECT_KIND],
      "#p": [bunkerPubkeyHex],
    },
  ];

  const inboundSeenRef = { v: false };

  const attachOnevent = (relay: Relay, relayUrl: string) =>
    async function onevent(event: Event) {
      if (event.kind !== NostrConnect) {
        log("warn", "ignored event (not Nostr Connect / kind 24133)", {
          identityId,
          relayUrl,
          kind: event.kind,
          from: event.pubkey.slice(0, 12),
        });
        return;
      }
      inboundSeenRef.v = true;
      clearIdleInboundWarnTimer(identityId);
      {
        const pTag = event.tags.find((t) => t[0] === "p")?.[1];
        log("info", "NIP-46 kind 24133 envelope received (before payload decrypt)", {
          identityId,
          relayUrl,
          eventIdPrefix: event.id.slice(0, 16),
          authorPrefix: event.pubkey.slice(0, 12),
          contentCharLen: event.content.length,
          eventCreatedAt: event.created_at,
          pRecipientPrefix:
            typeof pTag === "string" ? pTag.slice(0, 12) : null,
        });
      }
      try {
        const { plaintext, envelope } = decryptNip46InboundEventContent(
          secretKey,
          event.pubkey,
          event.content,
        );
        if (envelope === "nip04") {
          log("info", "NIP-46 inbound envelope: NIP-04 (NIP-44 did not parse)", {
            identityId,
            relayUrl,
            from: event.pubkey.slice(0, 12),
            eventIdPrefix: event.id.slice(0, 16),
          });
        }

        const req = parseNip46RpcPayload(plaintext);
        const clientPk = event.pubkey.slice(0, 12);
        const connectExtra =
          req.method === "connect"
            ? {
                connectParamsCount: req.params.length,
                bunkerClaimLen: (req.params[0] ?? "").length,
                secretParamLen: (req.params[1] ?? "").length,
                permsParamLen: (req.params[2] ?? "").length,
              }
            : {};

        const inboundLog = {
          identityId,
          relayUrl,
          method: req.method,
          rpcId: req.id,
          clientPk,
          eventCreatedAt: event.created_at,
          ...connectExtra,
        };
        if (req.method === "sign_event") {
          log(
            "info",
            `NIP-46 inbound ${req.method}`,
            inboundLog,
          );
        } else {
          log("info", "NIP-46 inbound", inboundLog);
        }

        const res = await runNip46Method(event.pubkey, req, {
          bunkerSecretKey: secretKey,
          bunkerPubkeyHex,
          completeConnect: (appPubkey, secret, trace) =>
            completeConnect(identityId, appPubkey, secret, trace),
          assertAppMayUseSigner: (appPubkey) =>
            assertAppMayUseSigner(identityId, appPubkey),
        });

        if (req.method === "connect") {
          if (res.error) {
            log("warn", "NIP-46 connect RPC error response", {
              identityId,
              relayUrl,
              rpcId: res.id,
              clientPk,
              errorPreview: res.error.slice(0, 160),
            });
          } else {
            log("info", "NIP-46 connect RPC ok", {
              identityId,
              relayUrl,
              rpcId: res.id,
              clientPk,
              resultPreview: (res.result ?? "").slice(0, 24),
            });
          }
        }

        await publishResponse(
          relay,
          relayUrl,
          secretKey,
          event.pubkey,
          res,
          identityId,
          req.id,
          req.method,
        );
      } catch (e) {
        log("error", "onevent handler failed", {
          identityId,
          relayUrl,
          err: e instanceof Error ? e.message : String(e),
        });
      }
    };

  const relaySubs: RelaySubscription[] = [];
  const connectFailures: { relayUrl: string; detail: string }[] = [];
  log("info", "startBunker: Relay.connect cascade starting", {
    identityId,
    attemptCount: relayUrls.length,
  });
  let idx = 0;
  for (const relayUrl of relayUrls) {
    idx += 1;
    const t0 = Date.now();
    let relay: Relay;
    log("info", "Relay.connect attempting", {
      identityId,
      relayIndex: idx,
      relayTotal: relayUrls.length,
      relayUrl,
    });
    try {
      relay = await Relay.connect(relayUrl, { enableReconnect: true });
    } catch (e) {
      const detail = thrownReason(e);
      connectFailures.push({ relayUrl, detail });
      log("warn", "NIP-46 relay WebSocket connect failed (trying next URL)", {
        identityId,
        relayUrl,
        relayIndex: idx,
        err: detail,
        elapsedMs: Date.now() - t0,
      });
      continue;
    }
    log("info", "Relay.connect established", {
      identityId,
      relayUrl,
      relayIndex: idx,
      elapsedMs: Date.now() - t0,
    });
    const sub = relay.subscribe(filters, {
      onevent: attachOnevent(relay, relayUrl),
      onclose: (reason) => {
        log("info", "NIP-46 relay subscription closed", {
          identityId,
          relayUrl,
          closeReasonLen: typeof reason === "string" ? reason.length : 0,
          closeReasonSnippet:
            typeof reason === "string" ? reason.slice(0, 80) : String(reason),
        });
      },
    });
    relaySubs.push({ relay, sub, relayUrl });
    log("info", "NIP-46 relay WebSocket subscribed (REQ filter snapshot)", {
      identityId,
      relayUrl,
      bunkerPkPrefix: bunkerPubkeyHex.slice(0, 12),
      bunkerPFilterHex: bunkerPubkeyHex,
      kindFilter: NOSTR_CONNECT_KIND,
      subscriptionFiltersJson: JSON.stringify(filters),
    });
  }

  if (relaySubs.length === 0) {
    const summary = connectFailures
      .map((f) => `${f.relayUrl}: ${f.detail}`)
      .join("; ");
    log("error", "startBunker: no relay reachable — throwing (client apps may report unreachable-bunker)", {
      identityId,
      attemptedUrls: relayUrls,
      bunkerPkPrefix: bunkerPubkeyHex.slice(0, 12),
      failureCount: connectFailures.length,
      failures: connectFailures,
      hint:
        "Check RELAY_URL / SIGNER_DAEMON_RELAY_URL, Docker DNS, nip46 whitelist (kind 24133), firewall",
    });
    throw new Error(
      `nip46-loop: no relay connected (tried ${relayUrls.length}): ${summary}`,
    );
  }

  if (connectFailures.length > 0) {
    log("warn", "NIP-46 bunker uses subset of configured relays (some URLs unreachable)", {
      identityId,
      attempted: relayUrls,
      connected: relaySubs.map((s) => s.relayUrl),
      failedCount: connectFailures.length,
    });
  }

  const ttlTimer = setTimeout(() => {
    log("info", "RAM TTL expired; clearing nsec", { identityId });
    void stopBunker(identityId);
  }, defaultRamTtlMs());

  const warnMs = idleInboundWarnMs();
  let idleInboundWarnTimer: ReturnType<typeof setTimeout> | undefined;
  if (warnMs > 0) {
    idleInboundWarnTimer = setTimeout(() => {
      const rt = active.get(identityId);
      if (!rt || inboundSeenRef.v) return;
      log(
        "warn",
        "NIP-46 subscription idle: no kind 24133 received yet (relay may be wrong for clients or panel author filter hiding events)",
        {
          identityId,
          event: "nip46_idle_no_inbound",
          warnAfterMs: warnMs,
          relayUrls: relaySubs.map((s) => s.relayUrl),
          bunkerPFilterHexPrefix: bunkerPubkeyHex.slice(0, 24),
        },
      );
    }, warnMs);
  }

  active.set(identityId, {
    secretKey,
    bunkerPubkeyHex,
    relaySubs,
    ttlTimer,
    idleInboundWarnTimer,
  });

  log("info", "bunker started", {
    identityId,
    relays: relaySubs.map((s) => s.relayUrl),
    attemptedRelayCount: relayUrls.length,
    bunkerPk: bunkerPubkeyHex.slice(0, 12),
  });
}

const NOSTRCONNECT_INIT_RELAY_MS = 8000;

export type SendNostrConnectInitiateParams = {
  bunkerPrivkeyBytes: Uint8Array;
  clientPubkeyHex: string;
  relayUrls: string[];
  secret: string;
  identityId?: string;
};

/**
 * One-shot outbound NIP-46 `connect` request (client-initiated / Nostr Connect “push” completion).
 * Opens each relay URL, publishes kind 24133, closes — independent of long-lived bunker subscriptions.
 */
export async function sendNostrConnectInitiate(
  params: SendNostrConnectInitiateParams,
): Promise<void> {
  const { bunkerPrivkeyBytes, secret, identityId } = params;
  const clientPk = params.clientPubkeyHex.trim().toLowerCase();
  const relayUrls = [
    ...new Set(params.relayUrls.map((u) => u.trim()).filter(Boolean)),
  ];

  if (relayUrls.length === 0) {
    log("warn", "nostrconnect initiate: no relay URLs", {
      identityId,
      clientPkPrefix: clientPk.slice(0, 12),
    });
    return;
  }

  const bunkerPubkeyHex = getPublicKey(bunkerPrivkeyBytes).toLowerCase();
  const requestId = randomUUID();
  const plaintext = JSON.stringify({
    id: requestId,
    method: "connect",
    params: [bunkerPubkeyHex, secret],
  });
  const skHex = bytesToHex(bunkerPrivkeyBytes);
  const content = nip04.encrypt(skHex, clientPk, plaintext);
  const ev = finalizeEvent(
    {
      kind: NOSTR_CONNECT_KIND,
      tags: [["p", clientPk]],
      content,
      created_at: Math.floor(Date.now() / 1000),
    },
    bunkerPrivkeyBytes,
  );

  for (const relayUrl of relayUrls) {
    const t0 = Date.now();
    let relay: Relay | undefined;
    try {
      await Promise.race([
        (async () => {
          relay = await Relay.connect(relayUrl, { enableReconnect: false });
          try {
            await relay.publish(ev);
          } finally {
            try {
              relay.close();
            } catch {
              /* ignore */
            }
            relay = undefined;
          }
        })(),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error(`timeout after ${NOSTRCONNECT_INIT_RELAY_MS}ms`)),
            NOSTRCONNECT_INIT_RELAY_MS,
          ),
        ),
      ]);
      log("info", "nostrconnect initiate: published on relay", {
        identityId,
        event: "nostrconnect_initiate_ok",
        relayUrl,
        requestId,
        eventIdPrefix: ev.id.slice(0, 16),
        elapsedMs: Date.now() - t0,
      });
    } catch (e) {
      const detail = thrownReason(e);
      log("warn", "nostrconnect initiate: relay failed", {
        identityId,
        event: "nostrconnect_initiate_relay_err",
        relayUrl,
        requestId,
        err: detail,
        elapsedMs: Date.now() - t0,
      });
      try {
        relay?.close();
      } catch {
        /* ignore */
      }
    }
  }
}

async function publishResponse(
  relay: Relay,
  relayUrl: string,
  bunkerSecretKey: Uint8Array,
  appPubkey: string,
  res: Nip46RpcResult,
  identityId: string,
  rpcId: string,
  method: string,
): Promise<void> {
  const convKey = nip44.getConversationKey(bunkerSecretKey, appPubkey);
  const content = nip44.encrypt(JSON.stringify(res), convKey);
  const ev = finalizeEvent(
    {
      kind: NOSTR_CONNECT_KIND,
      tags: [["p", appPubkey]],
      content,
      created_at: Math.floor(Date.now() / 1000),
    },
    bunkerSecretKey,
  );

  try {
    await relay.publish(ev);
    log("info", "NIP-46 response published to relay", {
      identityId,
      method,
      rpcId,
      responseTo: appPubkey.slice(0, 12),
      responseEventIdPrefix: ev.id.slice(0, 16),
      relay: relayUrl,
      ok: !res.error,
      ...(res.error
        ? { rpcErrorPreview: res.error.slice(0, 220) }
        : {}),
      encryptedOutCharLen: content.length,
    });
  } catch (e) {
    log("error", "publish response failed", {
      identityId,
      method,
      rpcId,
      err: e instanceof Error ? e.message : String(e),
      relay: relayUrl,
    });
  }
}
