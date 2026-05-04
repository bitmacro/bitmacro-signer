/**
 * NIP-46 bunker loop: WebSocket to relay, kind 24133 in/out with NIP-44 payload (matches `nostr-tools` BunkerSigner).
 */

import { relayConnectLog } from "@bitmacro/relay-connect";
import type { Event } from "nostr-tools";
import { finalizeEvent, getPublicKey } from "nostr-tools";
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

function defaultRamTtlMs(): number {
  const raw = process.env.BUNKER_SESSION_RAM_TTL_MS;
  if (raw && /^\d+$/.test(raw.trim())) {
    return Number.parseInt(raw.trim(), 10);
  }
  return 24 * 60 * 60 * 1000;
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
};

const active = new Map<string, BunkerRuntime>();

export function isRunning(identityId: string): boolean {
  return active.has(identityId);
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

  const filters = [
    {
      kinds: [NOSTR_CONNECT_KIND],
      "#p": [bunkerPubkeyHex],
    },
  ];

  const attachOnevent = (relay: Relay, relayUrl: string) =>
    async function onevent(event: Event) {
      if (event.kind !== NostrConnect) return;
      try {
        const convKey = nip44.getConversationKey(secretKey, event.pubkey);
        let plaintext: string;
        try {
          plaintext = nip44.decrypt(event.content, convKey);
        } catch (e) {
          log("warn", "NIP-44 decrypt failed (ignored)", {
            identityId,
            relayUrl,
            from: event.pubkey.slice(0, 12),
            err: e instanceof Error ? e.message : String(e),
          });
          return;
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
          log("debug", "NIP-46 inbound", inboundLog);
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
  for (const relayUrl of relayUrls) {
    const relay = await Relay.connect(relayUrl, { enableReconnect: true });
    const sub = relay.subscribe(filters, {
      onevent: attachOnevent(relay, relayUrl),
      onclose: (reason) => {
        log("debug", "subscription closed", { identityId, relayUrl, reason });
      },
    });
    relaySubs.push({ relay, sub, relayUrl });
  }

  const ttlTimer = setTimeout(() => {
    log("info", "RAM TTL expired; clearing nsec", { identityId });
    void stopBunker(identityId);
  }, defaultRamTtlMs());

  active.set(identityId, {
    secretKey,
    bunkerPubkeyHex,
    relaySubs,
    ttlTimer,
  });

  log("info", "bunker started", {
    identityId,
    relays: relayUrls,
    bunkerPk: bunkerPubkeyHex.slice(0, 12),
  });
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
    log("debug", "NIP-46 response published", {
      identityId,
      method,
      rpcId,
      responseTo: appPubkey.slice(0, 12),
      eventId: ev.id,
      relay: relayUrl,
      ok: !res.error,
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
